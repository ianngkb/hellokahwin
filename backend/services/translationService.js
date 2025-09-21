const OpenAI = require('openai');
const logger = require('../utils/logger');
const { APIError } = require('../middleware/errorHandler');

class TranslationService {
    constructor() {
        this.openai = null;
        this.defaultModel = 'gpt-4o-mini'; // More cost-effective for translation tasks
        this.maxRetries = 3;
        this.retryDelay = 1000;
    }

    initializeOpenAI() {
        if (!this.openai && process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
        }
        return !!this.openai;
    }

    async translateText(text, targetLanguage = 'ms', sourceLanguage = 'en', options = {}) {
        try {
            if (!this.initializeOpenAI()) {
                throw new APIError('OpenAI API key not configured', 400, 'INVALID_API_KEY');
            }

            const {
                model = this.defaultModel,
                context = '',
                preserveFormatting = true,
                maxTokens = 4000
            } = options;

            logger.info('Starting translation', {
                textLength: text.length,
                sourceLanguage,
                targetLanguage,
                model
            });

            const prompt = this.buildTranslationPrompt(text, sourceLanguage, targetLanguage, context, preserveFormatting);

            let lastError;
            for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
                try {
                    const completion = await this.openai.chat.completions.create({
                        model,
                        messages: [
                            {
                                role: 'system',
                                content: 'You are a professional translator specializing in accurate, culturally appropriate translations. Maintain the original tone and style while ensuring the translation is natural and fluent in the target language.'
                            },
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        max_tokens: maxTokens,
                        temperature: 0.2, // Lower temperature for more consistent translations
                    });

                    const translatedText = completion.choices[0]?.message?.content;

                    if (!translatedText) {
                        throw new Error('No translation received from OpenAI');
                    }

                    const result = {
                        translatedText: this.cleanTranslatedText(translatedText),
                        sourceLanguage,
                        targetLanguage,
                        model,
                        usage: completion.usage,
                        timestamp: new Date().toISOString()
                    };

                    logger.info('Translation completed successfully', {
                        sourceLength: text.length,
                        translatedLength: result.translatedText.length,
                        tokensUsed: completion.usage?.total_tokens
                    });

                    return result;

                } catch (error) {
                    lastError = error;
                    logger.warn(`Translation attempt ${attempt} failed`, {
                        error: error.message,
                        attempt,
                        willRetry: attempt < this.maxRetries
                    });

                    if (attempt < this.maxRetries) {
                        await this.delay(this.retryDelay * attempt);
                    }
                }
            }

            throw lastError;

        } catch (error) {
            logger.error('Translation failed', {
                error: error.message,
                textLength: text.length,
                sourceLanguage,
                targetLanguage
            });

            if (error.status === 401) {
                throw new APIError('Invalid OpenAI API key', 401, 'INVALID_API_KEY');
            } else if (error.status === 429) {
                throw new APIError('OpenAI rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
            } else if (error.status === 400) {
                throw new APIError('Invalid request to OpenAI', 400, 'INVALID_REQUEST');
            }

            throw new APIError('Translation service error', 500, 'TRANSLATION_ERROR');
        }
    }

    async translateBatch(texts, targetLanguage = 'ms', sourceLanguage = 'en', options = {}) {
        try {
            logger.info('Starting batch translation', {
                batchSize: texts.length,
                sourceLanguage,
                targetLanguage
            });

            const results = [];
            const errors = [];

            // Process translations in parallel with concurrency limit
            const concurrency = options.concurrency || 3;
            for (let i = 0; i < texts.length; i += concurrency) {
                const batch = texts.slice(i, i + concurrency);
                const batchPromises = batch.map(async (textItem, index) => {
                    try {
                        const result = await this.translateText(
                            textItem.text,
                            targetLanguage,
                            sourceLanguage,
                            options
                        );

                        return {
                            id: textItem.id,
                            originalText: textItem.text,
                            ...result
                        };
                    } catch (error) {
                        logger.error('Batch translation item failed', {
                            itemId: textItem.id,
                            error: error.message
                        });

                        errors.push({
                            id: textItem.id,
                            error: error.message,
                            originalText: textItem.text
                        });

                        return null;
                    }
                });

                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults.filter(result => result !== null));

                // Add delay between batches to respect rate limits
                if (i + concurrency < texts.length) {
                    await this.delay(500);
                }
            }

            logger.info('Batch translation completed', {
                successCount: results.length,
                errorCount: errors.length,
                totalItems: texts.length
            });

            return {
                results,
                errors,
                summary: {
                    total: texts.length,
                    successful: results.length,
                    failed: errors.length
                }
            };

        } catch (error) {
            logger.error('Batch translation failed', { error: error.message });
            throw new APIError('Batch translation failed', 500, 'BATCH_TRANSLATION_ERROR');
        }
    }

    buildTranslationPrompt(text, sourceLanguage, targetLanguage, context, preserveFormatting) {
        let prompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}:

${text}`;

        if (context) {
            prompt = `Context: ${context}\n\n${prompt}`;
        }

        if (preserveFormatting) {
            prompt += '\n\nIMPORTANT: Preserve all HTML tags, formatting, and structure exactly as they appear in the original text. Only translate the actual text content, not the HTML tags or attributes.';
        }

        return prompt;
    }

    cleanTranslatedText(text) {
        // Remove any potential markdown formatting that OpenAI might add
        return text
            .replace(/^```[\s\S]*?\n/, '') // Remove opening code blocks
            .replace(/\n```$/, '') // Remove closing code blocks
            .trim();
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getLanguageName(code) {
        const languages = {
            'en': 'English',
            'ms': 'Malay',
            'zh': 'Chinese',
            'ta': 'Tamil',
            'hi': 'Hindi',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'ja': 'Japanese',
            'ko': 'Korean'
        };
        return languages[code] || code;
    }

    validateApiKey() {
        return !!process.env.OPENAI_API_KEY;
    }
}

module.exports = new TranslationService();