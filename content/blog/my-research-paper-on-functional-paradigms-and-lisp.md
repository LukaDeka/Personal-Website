+++
title = "My research paper on Functional Paradigms and LISP"
description = "I talk about the seminar Open Distributed Systems at my uni, and present my research paper I had to write for it."
date = 2025-09-19
updated = 2025-09-19

[extra]
long_description = "Here I talk about the seminar Open Distributed Systems at the Technical University Berlin, present my experiences researching Lisps, Functional Paradigms, and their uses in enterprise environments, and present my research paper on these topics."
static_thumbnail = "https://lukadeka.com/images/my-research-paper-on-functional-paradigms-and-lisp.png"
+++

## Preface

In the Summer semester 2025 I signed up to a seminar worth 3 ECTS points at the Technical University Berlin since attending one seminar is mandatory for a Bachelor's degree in Computer Science.

Since seminar slots are hard to get for this exact reason, my university usually hosts a "meta-page" where you can rank your top choices and get assigned a seminar.

So I got assigned the seminar [Open Distributed Systems](https://moseskonto.tu-berlin.de/moses/modultransfersystem/bolognamodule/beschreibung/anzeigen.html?number=40996&version=1) (ODS).

## Introduction

The whole point of a seminar is to learn how to do research and gather first-hand experiences at writing your first scientific paper.

The process was split up like this:

* We had a few introductory classes
* Then we were instructed to write an extended abstract (max. two pages) based on a research paper from their curated list
* After which we had to anonymously give feedback to two other research papers using a template
* After we received the feedback, we had to prepare a 10 minute presentation, present it, and answer questions from the audience for an additional 5 minutes
* And in the end, after considering all the feedback, we had to submit 5-6 pages of the final research paper

All the while having 4 classes in total on how to do research, write a good research paper, how to present, the formalities, etc.

## Topic

I picked the paper [Recursive functions of symbolic expressions and their computation by machine, part I](https://www-formal.stanford.edu/jmc/recursive.pdf) by [John McCarthy](https://en.wikipedia.org/wiki/John_McCarthy_(computer_scientist)). I chose this topic because my friend was recommending Lisps, and I wanted to learn more about Functional Programming (FP) in general.  

I ended up phrasing my research question and topic like this:  
> "*In what way do the functional programming paradigms introduced in LISP contribute to the development of more reliable and maintainable software?*"

I mostly talked about the benefits of FP over imperative, how it supports Test-Driven Development (TDD), and what the benefits of enforcing static types as well as pure functions has.


I also argued that FP is very useful when a language rewrite is necessary, and when the priorities shift to codebase maintainability, readability, and minimizing runtime errors - since a lack thereof accounts to over 50% of project costs in practice:
> "*...a common misconception among beginner software developers is that designing and writing efficient programs is the most important task of the job. In practice, incorrect, unreadable, and hard to maintain software accounts to over fifty percent of the project costs. Tremendous resources could be saved if the focus were shifted to readability, reliability and correctness, but the reality shows that most businesses favor rapid development and software that just works in the present.*"

## The paper

Click here to <a target="_blank" rel="noopener noreferrer dofollow" href="/resources/functional-paradigms-in-lisp-and-its-contribution-to-reliable-maintainable-software.pdf">open the PDF in a new tab</a>.

<object data="/resources/functional-paradigms-in-lisp-and-its-contribution-to-reliable-maintainable-software.pdf" type="application/pdf" aria-label="My research paper 'Functional paradigms in LISP and its contributions to reliable, maintainable software'" width="100%" height="700px" allow="fullscreen">
  <p>This browser does not support PDFs. Please try <a target="_blank" rel="noopener noreferrer dofollow" href="/resources/functional-paradigms-in-lisp-and-its-contribution-to-reliable-maintainable-software.pdf">opening it in a new tab</a>, or <a href="/resources/functional-paradigms-in-lisp-and-its-contribution-to-reliable-maintainable-software.pdf" download="Functional paradigms in LISP and its contribution to reliable, maintainable software.pdf">download the PDF to view it</a>.</p>
</object>


## Shortcomings

As stated in the paper, I didn't have enough time, and was unable to find solid evidence to support all my claims. Because of this, I had to resort to logical reasoning, which wasn't as scientific as it should've been for a research paper, which I acknowledged here:
> "*Despite a lot of research being FP-centric, finding solid empirical evidence in industrial and enterprise contexts proved to be challenging. Due to a limited availability of published enterprise data, we relied on logical reasoning where empirical validation was unavailable.*"

Overall, I made it harder for myself by choosing such a broad topic, and trying to argue against a very popular paradigm.

Because I focused on FP, I didn't cover Lisps enough. I failed to mention and explain Lisp's macro system, which is its defining characteristic, which allows code to programmatically modify other parts of the code.

## Conclusion

Overall, I learned a lot about FP and the history of LISP by doing the research, as well as languages like Clojure, and BEAM-based languages like Erlang and Elixir. The experience gained in doing research will also come in handy for my Bachelor thesis.

If you'd like to cite my paper, here is the BibTeX:

```bib, copy
@misc{MaintainableFunctionalSoftware,
  author = {Luka Dekanozishvili},
  title = {Functional paradigms in LISP and its contribution to reliable, maintainable software},
  howpublished = {\url{https://lukadeka.com/resources/functional-paradigms-in-lisp-and-its-contribution-to-reliable-maintainable-software.pdf}},
  email = {research@lukadeka.com},
  school = {Technical University Berlin},
  address = {Berlin, DE},
  year = {2025},
  month = {October}
}
```

