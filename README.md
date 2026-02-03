AutonomousLinkedInApply
Automating the repetitive parts of modern job applications

Entering the software engineering market today means competing in an environment shaped by automation, global competition, and highly saturated job boards. Candidates are expected to manually repeat the same workflow hundreds of times—searching, filtering, opening postings, and filling nearly identical forms—often without receiving any feedback in return. This project was born from a simple observation: if hiring pipelines rely heavily on automation, candidates should be able to automate the mechanical parts of the process as well.

AutonomousLinkedInApply is a Puppeteer-based experiment that replicates how a human would navigate LinkedIn’s Easy Apply flow. The script logs into an existing authenticated browser profile, navigates to the Jobs section, applies filters such as title, location, workplace type, and experience level, and then iterates through job offers one by one. For each posting it opens the application modal, progresses through multi-step forms using the Next -> Review -> Submit sequence, handles success dialogs, and moves to the next available job. The focus of the project was not mass spamming but understanding how far a deterministic, human-like automation layer could go in reducing repetitive effort.

How it works

To avoid authentication issues, the script reuses a real Edge browser profile that has already been logged into LinkedIn manually. Browsers launched directly by automation frameworks run in testing mode and are often blocked; reusing an authenticated profile bypasses this limitation. Start Edge in testing mode and Log into LinkedIn, either by saved password from Microsoft or Apple (Google always denies auth if done through testing browser, but Microsoft and Apple dont.. ). After installing Puppeteer and the stealth plugin, the user simply runs node index.js. The automation incorporates randomized delays, scrolling behavior, and DOM inspection to mimic realistic interaction and handle LinkedIn’s React-based interface, which frequently re-renders elements during navigation.

Customization

Search parameters such as job title, location, remote/hybrid preference, and experience level can be adjusted directly in the script. The architecture supports cycling through multiple keyword sets and can be extended to integrate smarter filtering logic.

Technical challenges

Building this required solving problems that appear in real-world automation:

detecting and recovering from UI re-renders inside iframes

navigating multi-step modals with non-deterministic flows

distinguishing between filter “Easy Apply” and job-level “Easy Apply” actions

handling success dialogs and navigation timing

avoiding stale element references and detached nodes

These challenges made the project less about LinkedIn specifically and more about resilient browser automation.

Limitations

Some Easy Apply forms include custom mandatory questions. If a previously unseen field appears, the script may pause because there is no decision logic for answering free-form questions. Filtering is intentionally broad and does not evaluate true job relevance. Stealth techniques could also be improved, and the platform enforces a daily application cap regardless of account type.

Why development stopped

The concept sits in a gray ethical area and can reduce control over application quality. The daily Easy Apply limit and the risk of damaging recruiter relationships made further expansion questionable. The experiment nevertheless demonstrates how asymmetric the current hiring process is and how easily it can be automated.

Future direction

A more responsible evolution would transform this into an intelligent assistant rather than a mass applier:

scoring job descriptions against a CV

answering custom questions using saved profile data

human-in-the-loop approval before submission

structured tracking of applications and outcomes

Conclusion

This project shows that even large platforms are vulnerable to deterministic automation and highlights the inefficiency of current hiring funnels. From an engineering perspective it demonstrates practical skills in reverse-engineering UIs, handling asynchronous browser state, and designing fault-tolerant automation. From a candidate’s perspective it reflects a desire to reclaim time from a process that has become overwhelmingly mechanical.

Disclaimer: This project is for educational and research purposes only. Users should act responsibly and respect platform Terms of Service.
-This project proves that even a huge platform like LinkedIn, is not completely immune to bot behaviour. This algorithmic approach can be used on other similiar websites to achieve the same goal.
