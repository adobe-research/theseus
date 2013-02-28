Theseus
=======

Theseus is a new type of JavaScript debugger that makes it far easier to debug asynchronous code. Theseus is an extension for the code editor [Brackets](https://github.com/adobe/brackets). For the time being, it requires a special build of Brackets, but that shouldn't be true for much longer.

Theseus is part of a collaboration between the [User Interface Design Group at MIT CSAIL](http://groups.csail.mit.edu/uid/) and [Adobe Research](http://research.adobe.com/).

![Screenshot of Theseus](https://raw.github.com/adobe-research/theseus/gh-pages/screenshot.png)

Installing
----------

You need to use the `master` branch of Brackets to use Theseus. Get started with Brackets' guide [How to Hack on Brackets](https://github.com/adobe/brackets/wiki/How-to-Hack-on-Brackets). Theseus was most recently tested with `96cdc87ab4112a7958f9444ef575a8dd8629935b`.

Once you've built Brackets, run `npm install` in the extension's `brackets-theseus/` and `brackets-theseus/fondue/` directories.

Finally, you can install the `brackets-theseus` extension by copying or symlinking it into your extensions directory (Help > Show Extensions).

Using
-----

When you open a web page with Live Development (click the lightning bolt in the upper right of the Brackets window), Theseus shows call counts in the gutter next to every function definition. Click on one or more of them to show a log of all calls to those functions (with their arguments return values).

License
-------

Theseus is MIT licensed.
