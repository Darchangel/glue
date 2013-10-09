new function () {
    "use strict";

    var VIEW_ATTR = 'view', //Attribute to specify that a view should be loaded in a tag
        VIEW_LINK_ATTR = 'load-view', //Attribute, to be placed in a <a> tag, specifying that it will load a view
        VIEW_LINK_TARGET_ATTR = 'on', //Attribute, to be placed in a <a> tag with the VIEW_LINK_ATTR attribute, specifying the id of the element in which the viewis to be loaded
        // If this attribute is not specified, the view will be loaded in the nearest ancestor with a VIEW_ATTR attribute
        RELOAD_CLASS = 'reload-after'; //Class for elements that need reloading after compilation


    var view_cache = {}; //Cache for the loaded views



    //Check the whole document (or, optionally, a container) for anchor tags with view loading annotations, and set their click events accordingly

    function processAllLinks(container) {
        var $links = $('a[' + VIEW_LINK_ATTR + ']', container);
        $links.each(function () {
            var path = $(this).attr(VIEW_LINK_ATTR);
            var target = $(this).attr(VIEW_LINK_TARGET_ATTR);

            if (!target) { //If no target was specified, search for the innermost view container available to load the view
                var $elm = $(this);

                while (!target && $elm.prop('tagName').toLowerCase() != 'body') { //Check up the hierarchy until we find a target or reach the body
                    if ($elm.attr(VIEW_ATTR)) { //Got it!
                        if (!$elm.attr('id')) { //If no ID is defined, create one
                            $elm.attr('id', 'view_container_' + (new Date().getTime()));
                        }

                        target = $elm.attr('id');
                    } else {
                        $elm = $elm.parent();
                    }
                }
            }

            if (target) { //Only do something if a target was either specified or found
                $(this).click(function () {
                    var $container = $('#' + target);

                    loadView(path, $container); //Load the view
                    processAllLinks($container); //Set the links
                });
            }
        });
    }



    //Actually render a view (html file) into an element, setting all the included <link> and <script> tags in the document's <head>

    function renderView(view, element) {
        //If there are any links or scripts to load, load them first
        if (view.links.length || view.scripts.length) {
            var head = document.head || document.getElementsByTagName('head')[0];

            var link_length = view.links.length;
            for (var i = 0; i < link_length; i++) {
                head.appendChild(view.links[i]);
            }
            view.links = []; //All done, nothing else to do here

            var script_length = view.scripts.length;
            for (var i = 0; i < script_length; i++) {
                head.appendChild(view.scripts[i]);
            }
            view.scripts = []; //All done, nothing else to do here
        }

        var $elm = $(element);
        $elm.empty();
        $elm.append(view.body);

        //Check if there is any element that needs reloading after compilation (e.g. embedded flash videos)
        var reloaders = $('.' + RELOAD_CLASS, $elm);
        var len = reloaders.length;
        for (var i = 0; i < len; i++) {
            var elm = reloaders[i];
            var parent = elm.parentNode;

            //Remove it and put it back again. BAM, "reloaded".
            parent.removeChild(elm);
            setTimeout(function () { //Put the reload in the event queue. Otherwise it doesn't work.
                parent.appendChild(elm);
            }, 0);
        }

        //Finally, load any other views that may be defined in this one
        loadAllViews($elm);
    }


    //Load a single view (html file) into an element, saving it in cache

    function loadView(path, element) {
        if (!(path in view_cache)) {
            $.get(path, function (html) {
                var view = parse_view(html, path);
                view_cache[path] = view;
                renderView(view, element);
            });
        } else {
            renderView(view_cache[path], element);
        }
    }


    //Check the whole document (or, optionally, a container) for tags with view annotations, and load them

    function loadAllViews(container) {
        //Load all the views, recursively (views can be nested)
        var $views = $('[' + VIEW_ATTR + ']', container);
        $views.each(function () {
            var element = $(this);
            var path = element.attr(VIEW_ATTR);
            if (path) //Load only if path not empty
                loadView(path, element);
        });
    }


		//Set the view loading on the DOM ready event

    function onReady() {
        $(function () {
            loadAllViews(); //Load all the defined views...
            processAllLinks(); //...and process all the links
        });
    }


    //Check if jQuery is loaded, and go get it if not
    if (!window.jQuery) {
        var script = document.createElement('script');
        var head = document.head || document.getElementsByTagName('head')[0];
        script.src = 'http://code.jquery.com/jquery-1.10.2.min.js';

        var done = false;

        script.onreadystatechange = script.onload = function () {

            if (!done && isScriptReady(script.readyState)) {
                done = true;
                onReady();

                // Handle memory leak in IE
                script.onload = script.onreadystatechange = null;
            }
        };

				head.appendChild(script);
    } else {
        onReady();
    }




    /******************************************************************************
     * Auxiliary functions
     *
     ******************************************************************************/

    //Check every possible way that a script can be marked as ready (shamelessly stolen from yepnope.js - https://github.com/SlexAxton/yepnope.js)

    function isScriptReady(readyState) {
        return (!readyState || readyState == "loaded" || readyState == "complete" || readyState == "uninitialized");
    }

    //Parse a html file of a view, extract the link and script tags from it and fix their paths

    function parse_view(html_fragment, view_path) {
        var parts = {
            body: null,
            scripts: [],
            links: []
        };

        //Calculate the base path for the scripts from the view path
        var path_parts = view_path.split('/');
        path_parts.pop(); //Remove the last one (the view file)
        var base_path = path_parts.join('/'); //Put them together again

        var elem = document.createElement('div');

        elem.innerHTML = html_fragment;

        var links = elem.getElementsByTagName('link');
        var scripts = elem.getElementsByTagName('script');

        //Add all <link>s to 
        var nlinks = links.length;
        for (var idx = 0; idx < nlinks; idx++) {
            var link = links[idx].cloneNode(true);
            link.href = add_parent_path(base_path, link.href); //Point the URL to the correct place
            parts.links.push(link);
        }

        while (links.length > 0) {
            elem.removeChild(links[0]);
        }

        var nscripts = scripts.length;
        for (var idx = 0; idx < nscripts; idx++) {
            var tag = scripts[idx];
            var script = document.createElement('script');
            script.type = tag.type;
            if (tag.src) {
                script.src = add_parent_path(base_path, tag.src); //Point the URL to the correct place
            } else {
                //Add any child nodes (i.e. the script)
                var nodes = tag.childNodes;
                for (var jdx = 0; jdx < nodes.length; jdx++) {
                    var node = nodes[jdx];
                    script.appendChild(node);
                }
            }
            parts.scripts.push(script);
        }

        while (scripts.length > 0) {
            elem.removeChild(scripts[0]);
        }

        parts.body = elem;

        return parts;
    }

    //Adds <parent> as a parent to <path>, if <path> is relative

    function add_parent_path(parent, path) {
        if (!path.indexOf('http://') < 0 && !path.indexOf('https://') < 0) { //Not an absolute path
            path.replace(/^\//, ''); //Remove the first slash, if any
            path = parent + '/' + path;
        } else { //An absolute path
            //If in this domain, just add the parent path in the middle of the URL
            var top = document.location.toString();
            path = path.replace(top, top + parent + '/').replace(document.location.origin, '');
            path = path.replace('//', '/'); //Just in case a slash slipped by
        }

        return path;
    }
}();
