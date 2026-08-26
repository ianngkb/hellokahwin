-- UNDO for SEO-06 re-file, generated 2026-08-26T14:47:24.009Z from LIVE rows. Addresses rows by id only.
begin;
update articles set primary_category_id = 'd8b9992d-7553-45ac-be4f-a2036db37f98', updated_at = '2026-08-25T18:01:59.511Z' where id = 'de528bb4-650a-4c19-a1fa-5770d5963d0d';
update articles set primary_category_id = 'd8b9992d-7553-45ac-be4f-a2036db37f98', updated_at = '2026-08-26T13:40:15.652Z' where id = 'dd3bf19c-f43d-4907-87ee-fd8c41fc6664';
delete from article_categories where article_id in ('de528bb4-650a-4c19-a1fa-5770d5963d0d', 'dd3bf19c-f43d-4907-87ee-fd8c41fc6664') and category_id in ('97473dfb-15ff-43bd-a215-4f9cd6fd6376', '2ca40e4d-9d39-4b3c-b39b-c47578f72181', '2e062943-d706-45bc-b8ee-3a6854321760');
insert into article_categories (id, article_id, category_id) values ('53051083-c416-4aa0-94c3-bc07fa36ce11', 'dd3bf19c-f43d-4907-87ee-fd8c41fc6664', 'd8b9992d-7553-45ac-be4f-a2036db37f98') on conflict do nothing; -- hiasan-dekorasi
insert into article_categories (id, article_id, category_id) values ('819695d2-2676-4f74-a7ad-39ccf080853a', 'dd3bf19c-f43d-4907-87ee-fd8c41fc6664', '1d81e279-c4d0-4daa-a870-f57f752cbe87') on conflict do nothing; -- idea-dan-nasihat
insert into article_categories (id, article_id, category_id) values ('055cd193-4dfa-4604-84ad-c06bb704483f', 'dd3bf19c-f43d-4907-87ee-fd8c41fc6664', '22a2a694-5929-477e-adf4-e8d795ab661e') on conflict do nothing; -- perancangan
insert into article_categories (id, article_id, category_id) values ('5772f2f7-0619-4171-bda2-8b7ca339dc27', 'de528bb4-650a-4c19-a1fa-5770d5963d0d', 'd8b9992d-7553-45ac-be4f-a2036db37f98') on conflict do nothing; -- hiasan-dekorasi
insert into article_categories (id, article_id, category_id) values ('cab33b21-ee44-4fef-a105-65f885e7d0b2', 'de528bb4-650a-4c19-a1fa-5770d5963d0d', '1d81e279-c4d0-4daa-a870-f57f752cbe87') on conflict do nothing; -- idea-dan-nasihat
insert into article_categories (id, article_id, category_id) values ('85e86e44-1199-4134-99a5-f9b3bdd37279', 'de528bb4-650a-4c19-a1fa-5770d5963d0d', '22a2a694-5929-477e-adf4-e8d795ab661e') on conflict do nothing; -- perancangan
commit;
