# Booking Agent Demo

**Live:** https://kaihuan-huang.github.io/booking-agent-demo/

A bilingual (English / 中文) restaurant booking agent that never books until the guest says yes, and never fills in a value the guest didn't give. An independent reimplementation of the design of Nalu, the guest assistant I rebuilt at [IPOT](https://ipot.food/). All data is synthetic.

- **Rules, not a model, read the booking:** date, time, party size and name. Anything unclear ("at 7") becomes a question.
- **One action, `create_reservation`,** runs only after a bare, explicit yes; "ok" or "好" asks again. The result is *pending* until the restaurant confirms.
- **Compare with an LLM on your machine:** with [Ollama](https://ollama.com) running, the page asks your local model to read the same conversation and marks where it guessed.
- **Tests:** 31 synthetic conversations run in the browser with a fixed clock.

On Nalu itself, a model-only pilot got 17 of 30 messages fully right (57%) with invented values; rules plus the confirmation gate got 33 of 39 held-out messages right (85%) with 0 wrong or invented values.

## Run locally

```sh
python3 -m http.server 8000   # then open http://localhost:8000
node -e 'require("./agent.js"); require("./evals.js"); const r = BookingEvals.run(BookingAgent); console.log(r.filter(x => x.pass).length + "/" + r.length)'
```
