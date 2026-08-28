# Dispatch probe — prove the fleet can start

You are a throwaway probe. Do exactly this, quickly, then stop.

1. Run: `curl -s -o /dev/null -w "%{http_code}" https://hellokahwin.com/`
2. Run: `git -C ~/Documents/Code/hellokahwin/hellokahwin rev-parse --short HEAD`
3. Append one line to `docs/plans/aug-28-2026-session-01/PROBE-RESULT.txt`
   in the hellokahwin repo, in exactly this format:

   `PROBE EXIT: 0 http=<code> head=<sha>`

Then print that same line to the terminal and stop. Do not explore, do
not read other files, do not commit anything.

If you hit an authentication or login error, write instead:

   `PROBE EXIT: 1 reason=<what blocked you>`
