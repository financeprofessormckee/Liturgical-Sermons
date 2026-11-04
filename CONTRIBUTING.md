# Corrections and contributions

Corrections and suggestions are welcome. This is a personal project maintained in
spare time, so a report may take some while to be checked, but each one is read.

## How to report a problem

The simplest route is the
[Feedback page](https://financeprofessormckee.github.io/Liturgical-Sermons/feedback.html)
on the site. Choose the sermon, and it opens a GitHub issue already filled in with
the sermon's title and link. You can also
[open an issue](https://github.com/financeprofessormckee/Liturgical-Sermons/issues/new/choose)
here and choose one of the forms. Either way a GitHub account is needed.

### An error in the original text

Give the sermon, the paragraph (each paragraph has a permanent link, marked ¶),
the reading as it appears on the site, and the reading you believe the edition
has. Please give the page or column of the printed edition, which is shown in the
margin in Scholar mode, and say whether you checked the page image linked from the
sermon's Edition & translation section. A correction is made only when it can be
confirmed against the cited edition.

### A problem with a translation

Give the sermon and the paragraph, quote the English that seems wrong and the
original it renders, and explain the difficulty: an omission, an addition, a
mistranslation, a misleading theological term, or a Scripture passage rendered in a
way that does not match the preacher's quotation. A suggested rendering is helpful.
If you are drawing on a published translation or a lexicon, please cite it.

### A wrong or missing reference

For a Scripture reference, give the book, chapter and verse and say which numbering
you are using; the site keeps the numbering of the historical edition, so a Psalm
may be numbered differently from a modern Bible. For a citation of a Father or other
author, give the work and the edition you consulted.

### A bibliographic error

Give the sermon, the part of the citation that is wrong, and the correct detail
with its source, such as a library catalogue record or the title page of the
edition.

### A broken link or a fault in the site

Give the page address, what you did, what you expected and what happened, and the
browser and device you were using.

## Suggesting a sermon, an author or an edition

Suggestions for the collection are welcome, especially sermons for which no
accessible English translation exists. The scope is described in the
[editorial policy](EDITORIAL_POLICY.md#scope-and-selection). Please give as much of
the following as you can:

- the author and the sermon, with the feast or season for which it was preached;
- the edition: title, editor, place, publisher, year, volume and pages or columns;
- a link to a digitized copy, and the library or archive that holds it;
- anything known about the rights status of that edition and copy;
- any existing English translation known to you, with its details.

## Changes to the code

This repository holds the published output of a separate authoring project. The
HTML pages, `catalog.json` and the search index are generated from structured
records there and are replaced at each update, so a pull request that edits them
cannot be merged as it stands. Pull requests are still useful as a precise way to
propose a change to the site's behaviour, styles or scripts, or to the checks in
`tools/`. If one is accepted, the change is made in the authoring project and
appears here with the next update, with credit given in the commit.

Corrections to texts and translations should be sent as issues rather than pull
requests, so that they can be checked against the edition and reviewed in the
usual way.

## What is recorded

Accepted corrections to texts, translations, notes and citations are listed in
[CHANGES.md](CHANGES.md). Contributions are made under the licences described in
[LICENSE](LICENSE): text under CC BY 4.0 and code under the MIT License.
