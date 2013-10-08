glue
====

Quick modular web app prototyping

##TODO: Write something better here.

##Usage:

First, define your views in .html files. Any scripts or css files you need to
include specifically for that view, include them directly in the html (they will
		be extracted into the document's <head> later).

* To load a view, just include an element with the `view` attribute, like this:

```html
<div id="this_div" view="path/to/your/file.html"/>
```

View files are regular html, and can have nested views declared inside. Just
remember that the view paths must be relative to the main html file (usually,
		your index.html).

* To have links changing your views, include a link with the `load-view`
attribute and, optionally, a target element (by `id`) with the `on` attribute:

```html
<a href="#" load-view="path/to/that/other/file.html" on="that_other_div"> Load the other view </a>
```

When this link is clicked, the target div (in this case, the one whose id is
		`that_other_div`) will have its content replaced with html in the specified file.
If no target is specified, Glue will climb up the DOM hierarchy from the `<a>`
tag up, trying to find the first element with a `view` attribute. If one is
found, the view is loaded in it. Otherwise, nothing happens.

This means that if you only have one view at a time, you don't need to worry
about specifying a target (although you probably should).
