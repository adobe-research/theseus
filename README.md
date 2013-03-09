Theseus
=======

Theseus is a new type of JavaScript debugger that makes it far easier to debug asynchronous code. Theseus is an extension for the code editor [Brackets](https://github.com/adobe/brackets). For the time being, it requires a special build of Brackets, but that shouldn't be true for much longer.

Theseus is part of a collaboration between the [User Interface Design Group at MIT CSAIL](http://groups.csail.mit.edu/uid/) and [Adobe Research](http://research.adobe.com/).

![Screenshot of Theseus](https://raw.github.com/adobe-research/theseus/gh-pages/screenshot.png)

Download & Install
------------------

Theseus works with Brackets on OS X as of Sprint 21. It should work on Windows shortly.

Download version 0.1: https://s3.amazonaws.com/alltom/theseus/theseus-0.1.0.zip (1.7 MB)

Copy the `brackets-theseus` directory into your extensions folder (`Help > Show Extensions Folder` in Brackets).

Using
-----

When you open a web page with Live Development (click the lightning bolt in the upper right of the Brackets window), Theseus shows call counts in the gutter next to every function definition. Click on one or more of them to show a log of all calls to those functions with their arguments return values.

Using with Rails
----------------

Brackets doesn't officially support server-side technologies where there's no 1:1 mapping between URL structure and local file structure (https://github.com/adobe/brackets/issues/2103). However, Theseus has some support for **JavaScript files served from `/assets/` and `/public/` in development mode**.

1. Start Rails in development mode on port 3000 (run `rails server`)
2. Open `config/application.rb` in Brackets and start Live Development mode by clicking the lightning bolt in the upper-right corner.
3. Chrome should start and redirect you to the root of your Rails site.

Rails support **relies on undocumented bugs in Brackets** (specifically, the remote debugging connection to Chrome persists even when the Live Development connection times out (I guess this is documented now (please don't fix it yet))), so it could stop working at any time.

Installing From Source
----------------------

The `build.sh` script clones the current `master` branch, uses `npm` to install its dependencies, then creates a zip file in the `build` directory.

License
-------

Theseus is MIT licensed.
