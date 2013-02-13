Theseus
=======

Theseus is a new type of JavaScript debugger that makes it easier (we hope!) to debug asynchronous code. Theseus is an extension for the code editor [Brackets](https://github.com/adobe/brackets). Currently, however, it requires a special build of Brackets. This will hopefully change soon.

Theseus is part of a collaboration between the [User Interface Design Group at MIT CSAIL](http://groups.csail.mit.edu/uid/) and [Adobe Research](http://research.adobe.com/).

Installing
----------

You currently need a special build of Brackets to use Theseus. Get started with Brackets' guide [How to Hack on Brackets](https://github.com/adobe/brackets/wiki/How-to-Hack-on-Brackets).

Use the `cmv3` branch of brackets, which includes CodeMirror 3. Apply the Theseus patch with `git apply ld.patch`. (Last tested with `94748575269e1bcb66a9aa6219f5515bc65f8473`.)

Use the `node-process-3` branch of `brackets-shell`, which includes an API for launching node.js servers. Theseus uses this for its code-rewriting proxy. (Last tested with `08bd9c9bfbd58a31f48bf874853c8da9d8eda6b4`.)

Finally, you can install the `brackets-theseus` extension like any other. Copy or symlink it into your extensions directory (Help > Show Extensions).

Using
-----

When you open a web page with Live Development (click the lightning bolt in the upper right of the Brackets window), Theseus shows call counts in the gutter next to every function definition. Click on one or more of them to show a log of all calls to those functions (with their arguments return values).

![Screenshot of Theseus](http://adobe-research.github.com/theseus/screenshot.png)

License
-------

Theseus is MIT licensed.
