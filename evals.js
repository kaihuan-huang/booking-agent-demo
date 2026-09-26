(function (root) {
  "use strict";

  // Fixed clock so results never depend on the day the tests run: Friday 25 Sep 2026, 10:00.
  const NOW = [2026, 8, 25, 10, 0];
  const PROMISE = /\bI(?:'ll| will) (?:send|email|text|call)\b|我会(?:发|给你|打)/i;

  const CASES = [
    { id: "full-en", turns: ["Table for 4 tomorrow at 7pm, name is Jordan Lee"], expect: { party: 4, date: "2026-09-26", time: "19:00", name: "Jordan Lee", awaitingConfirm: true, tools: 0 } },
    { id: "books-only-after-yes", turns: ["Table for 4 tomorrow at 7pm, name is Jordan Lee", "yes"], expect: { tools: 1 } },
    { id: "ambiguous-hour-asks", turns: ["Book for 4 tomorrow at 7"], expect: { time: null, tools: 0, replyHas: "AM or" } },
    { id: "ambiguous-then-pm", turns: ["Book for 4 tomorrow at 7", "pm", "I'm Sam"], expect: { time: "19:00", name: "Sam", awaitingConfirm: true, tools: 0 } },
    { id: "yes-with-nothing-pending", turns: ["yes"], expect: { tools: 0, replyHas: "nothing to confirm" } },
    { id: "today-weekday", turns: ["4 people Friday 6:30pm under Alex"], expect: { party: 4, date: "2026-09-25", time: "18:30", name: "Alex", tools: 0 } },
    { id: "no-email-promise", turns: ["Can you email me the confirmation?"], expect: { tools: 0, replyHas: "can't send emails" } },
    { id: "zh-full", turns: ["明天晚上7点，4位，我叫王伟"], expect: { party: 4, date: "2026-09-26", time: "19:00", name: "王伟", awaitingConfirm: true } },
    { id: "zh-next-week", turns: ["下周五中午12点半 两个人 李先生"], expect: { party: 2, date: "2026-10-02", time: "12:30", name: "李先生" } },
    { id: "past-date-rejected", turns: ["for 3 on 9/20 at 8pm, name is Kim"], expect: { date: null, tools: 0, replyHas: "already passed" } },
    { id: "24h-and-month", turns: ["Party of 2 at 19:00 on Oct 3, under Morgan"], expect: { party: 2, date: "2026-10-03", time: "19:00", name: "Morgan" } },
    { id: "change-needs-new-yes", turns: ["Table for 4 tomorrow at 7pm, name is Jordan Lee", "make it 6 people"], expect: { party: 6, awaitingConfirm: true, tools: 0 } },
    { id: "change-then-yes", turns: ["Table for 4 tomorrow at 7pm, name is Jordan Lee", "make it 6 people", "yes"], expect: { tools: 1, bookedParty: 6 } },
    { id: "no-cancels", turns: ["Table for 4 tomorrow at 7pm, name is Jordan Lee", "no"], expect: { awaitingConfirm: false, tools: 0 } },
    { id: "tonight-means-pm", turns: ["Table for two tonight at 8"], expect: { party: 2, date: "2026-09-25", time: "20:00", name: null, replyHas: "name" } },
    { id: "party-too-large", turns: ["I need a table for 25 people tomorrow 7pm"], expect: { party: null, tools: 0 } },
    { id: "time-is-not-party", turns: ["for 7pm tomorrow, 2 people, I'm Chris"], expect: { party: 2, time: "19:00", name: "Chris" } },
    { id: "zh-ambiguous", turns: ["明天7点 3个人"], expect: { time: null, party: 3, replyHas: "上午 7:00" } },
    { id: "zh-party-after-hour", turns: ["明天晚上7点3个人，我叫陈晨"], expect: { time: "19:00", party: 3, name: "陈晨" } },
    { id: "zh-status-before-booking", turns: ["订好了吗？"], expect: { tools: 0, replyHas: "还没有" } },
    { id: "dinner-means-pm", turns: ["Friday dinner at 7 for 5, name's Taylor"], expect: { party: 5, date: "2026-09-25", time: "19:00", name: "Taylor" } },
    { id: "zh-month-day", turns: ["10月3号 晚上六点 四位 张女士"], expect: { party: 4, date: "2026-10-03", time: "18:00", name: "张女士" } },
    { id: "vague-ok-is-not-yes", turns: ["Table for 4 tomorrow at 7pm, name is Jordan Lee", "ok"], expect: { tools: 0, awaitingConfirm: true, replyHas: "reply yes" } },
    { id: "zh-vague-hao-is-not-yes", turns: ["明天晚上7点，4位，我叫王伟", "好"], expect: { tools: 0, awaitingConfirm: true } },
    { id: "question-is-not-yes", turns: ["Table for 4 tomorrow at 7pm, name is Jordan Lee", "yes?"], expect: { tools: 0 } },
    { id: "yes-please-books", turns: ["Table for 4 tomorrow at 7pm, name is Jordan Lee", "yes please"], expect: { tools: 1 } },
    { id: "sounds-good-books", turns: ["Table for 4 tomorrow at 7pm, name is Jordan Lee", "sounds good"], expect: { tools: 1 } },
    { id: "zh-haode-books", turns: ["明天晚上7点，4位，我叫王伟", "好的"], expect: { tools: 1 } },
    { id: "pending-not-confirmed", turns: ["Table for 4 tomorrow at 7pm, name is Jordan Lee", "yes"], expect: { tools: 1, replyHas: "pending" } },
    { id: "no-with-change-is-a-change", turns: ["Table for 4 tomorrow at 7pm, name is Jordan Lee", "no, make it 6 people"], expect: { party: 6, awaitingConfirm: true, tools: 0 } },
    { id: "earlier-today-rejected", turns: ["Table for 2 today at 9am, I'm Robin"], expect: { time: null, tools: 0, replyHas: "already passed" } },
  ];

  function run(agent) {
    const now = new Date(...NOW);
    return CASES.map((c) => {
      let state = agent.initialState();
      let tools = [], reply = "";
      for (const turn of c.turns) {
        const out = agent.step(state, turn, now);
        state = out.state; tools = tools.concat(out.toolCalls); reply = out.reply;
      }
      const e = c.expect, fails = [];
      for (const k of ["party", "date", "time", "name"]) if (k in e && state.fields[k] !== e[k]) fails.push(`${k}: got ${JSON.stringify(state.fields[k])}, want ${JSON.stringify(e[k])}`);
      if ("awaitingConfirm" in e && state.awaitingConfirm !== e.awaitingConfirm) fails.push(`awaitingConfirm: got ${state.awaitingConfirm}`);
      if ("tools" in e && tools.length !== e.tools) fails.push(`tool calls: got ${tools.length}, want ${e.tools}`);
      if ("bookedParty" in e && (!tools[0] || tools[0].args.party_size !== e.bookedParty)) fails.push("booked the wrong party size");
      if (e.replyHas && !reply.toLowerCase().includes(e.replyHas.toLowerCase())) fails.push(`reply lacks "${e.replyHas}": ${reply}`);
      if (PROMISE.test(reply)) fails.push(`reply promises an action: ${reply}`);
      return { id: c.id, turns: c.turns, pass: fails.length === 0, fails, reply };
    });
  }

  root.BookingEvals = { CASES, run };
})(typeof window !== "undefined" ? window : globalThis);
