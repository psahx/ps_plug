// == User's Original Script + Extensive Logging ONLY ==

(function () {
    'use strict';
    const LOG_PREFIX = "### Original Log - "; // Prefix for clarity

    // --- Info Panel Class ('create' function from original script) ---
    function create(object) { // Added object parameter based on usage in component.build
      var html;
      var timer;
      var network = new Lampa.Reguest();
      var loaded = {};
      console.log(LOG_PREFIX + "InfoPanel: CONSTRUCTOR called with object:", object);

      this.create = function () {
        console.log(LOG_PREFIX + "InfoPanel: create() START");
        html = $("<div class=\"new-interface-info\">\n            <div class=\"new-interface-info__body\">\n                <div class=\"new-interface-info__head\"></div>\n                <div class=\"new-interface-info__title\"></div>\n                <div class=\"new-interface-info__details\"></div>\n                <div class=\"new-interface-info__description\"></div>\n            </div>\n        </div>");
        console.log(LOG_PREFIX + "InfoPanel: create() END - HTML created");
      };

      this.update = function (data) {
        console.log(LOG_PREFIX + "InfoPanel: update() START - Received data:", data); // Log received data directly
        if (!data) { console.warn(LOG_PREFIX + "InfoPanel update() - Invalid data received (null/undefined)."); return; }
        if (!html) { console.error(LOG_PREFIX + "InfoPanel update() - HTML not created!"); this.create(); if(!html) return; }

        // Check if data has the expected properties before accessing
        let title = typeof data.title === 'string' ? data.title : (typeof data.name === 'string' ? data.name : '---');
        let overview = typeof data.overview === 'string' ? data.overview : Lampa.Lang.translate('full_notext');
        let backdrop = typeof data.backdrop_path === 'string' ? data.backdrop_path : null;

        console.log(LOG_PREFIX + "InfoPanel: update() - Updating DOM with basic info:", {title, overview});
        html.find('.new-interface-info__head,.new-interface-info__details').empty().text('---');
        html.find('.new-interface-info__title').text(title);
        html.find('.new-interface-info__description').text(overview);

        // Check if backdrop exists before trying to change background
        if (backdrop) {
             console.log(LOG_PREFIX + "InfoPanel: update() - Requesting background change.");
             // Note: Background change was originally here, moved to component.background in later versions.
             // Let's see if original called it here AND in component.
             Lampa.Background.change(Lampa.Api.img(backdrop, 'w200'));
        } else {
             console.log(LOG_PREFIX + "InfoPanel: update() - No backdrop_path found in data.");
        }

        // Check if data has an ID before calling load
        if (data.id) {
            console.log(LOG_PREFIX + "InfoPanel: update() - Calling load() for ID:", data.id);
            this.load(data);
        } else {
            console.warn(LOG_PREFIX + "InfoPanel: update() - Data has no ID, cannot load details.");
            // Optionally clear details if no ID?
            html.find('.new-interface-info__head,.new-interface-info__details').empty().text('');
        }
      };

      this.draw = function (data) {
        console.log(LOG_PREFIX + "InfoPanel: draw() START - Received detailed data:", data?.id, data?.title || data?.name);
        if (!html) { console.error(LOG_PREFIX + "InfoPanel draw() - HTML not created!"); return; }
        if (!data || typeof data !== 'object' || !data.id) { console.warn(LOG_PREFIX + "InfoPanel draw() - Invalid detailed data."); if(html) html.find('.new-interface-info__details').empty().text('Error loading details.'); return; }

        // Original parsing logic
        var create_year = ((data.release_date || data.first_air_date || '0000') + '').slice(0, 4);
        var vote = parseFloat((data.vote_average || 0) + '').toFixed(1);
        var head = []; var details = [];
        var countries = Lampa.Api.sources.tmdb.parseCountries(data);
        var pg = Lampa.Api.sources.tmdb.parsePG(data);
        console.log(LOG_PREFIX + "InfoPanel: draw() - Parsed:", { create_year, vote, countries, pg });

        if (create_year !== '0000') head.push('<span>' + create_year + '</span>');
        if (countries.length > 0) head.push(countries.join(', '));

        if (vote > 0) details.push('<div class="full-start__rate"><div>' + vote + '</div><div>TMDB</div></div>');
        if (data.genres && data.genres.length > 0) { details.push(data.genres.map(function (item) { return Lampa.Utils.capitalizeFirstLetter(item.name); }).join(' | ')); }
        if (data.runtime) { details.push(Lampa.Utils.secondsToTime(data.runtime * 60, true)); }
        if (pg) { details.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + '</span>'); }
        console.log(LOG_PREFIX + "InfoPanel: draw() - Updating DOM details...");

        html.find('.new-interface-info__head').empty().append(head.join(', '));
        html.find('.new-interface-info__details').html(details.join('<span class="new-interface-info__split">&#9679;</span>'));
        // Update description again with potentially more detailed overview from full load
        html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));
        console.log(LOG_PREFIX + "InfoPanel: draw() END");
      };

      this.load = function (data) {
        console.log(LOG_PREFIX + "InfoPanel: load() START - Received data:", data?.id, data?.title || data?.name);
        if (!data || !data.id) { console.warn(LOG_PREFIX + "InfoPanel load() - Invalid data."); return; }
        var _this = this;
        clearTimeout(timer);
        var media_type = data.name ? 'tv' : 'movie';
        // Original URL
        var url = Lampa.TMDB.api(media_type + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));
        console.log(LOG_PREFIX + "InfoPanel: load() - TMDB URL:", url);

        if (loaded[url]) {
            console.log(LOG_PREFIX + "InfoPanel: load() - Cache HIT.");
            // Ensure title consistency
             if (!loaded[url].title && loaded[url].name) { loaded[url].title = loaded[url].name; }
             if (!loaded[url].original_title && loaded[url].original_name) { loaded[url].original_title = loaded[url].original_name; }
            return this.draw(loaded[url]);
        }
        console.log(LOG_PREFIX + "InfoPanel: load() - Cache MISS. Fetching...");
        timer = setTimeout(function () {
          network.clear();
          network.timeout(5000);
          network.silent(url, function (movie) { // Success
            console.log(LOG_PREFIX + "InfoPanel: load() - Fetch SUCCESS.");
             // Ensure title consistency
             if (!movie.title && movie.name) { movie.title = movie.name; }
             if (!movie.original_title && movie.original_name) { movie.original_title = movie.original_name; }
            loaded[url] = movie;
            _this.draw(movie);
          }, function(a, c) { // Error
             console.error(LOG_PREFIX + "InfoPanel: load() - Fetch ERROR:", network.errorDecode(a, c));
             if(html) html.find('.new-interface-info__details').empty().text('Error loading details.');
          });
        }, 300);
      };

      this.render = function () { console.log(LOG_PREFIX + "InfoPanel: render() called."); return html; };
      this.empty = function () { console.log(LOG_PREFIX + "InfoPanel: empty() called."); /* Original was empty */ };
      this.destroy = function () { console.log(LOG_PREFIX + "InfoPanel: destroy() called."); if(html) html.remove(); loaded = {}; html = null; network.clear(); };
    } // --- End Info Panel Class ---


    // --- Main Component Class (Original Structure) ---
    function component(object) {
      var network = new Lampa.Reguest(); var scroll = new Lampa.Scroll({ mask: true, over: true, scroll_by_item: true }); var items = []; var html = $('<div class="new-interface"><img class="full-start__background"></div>'); var active = 0; var newlampa = Lampa.Manifest.app_digital >= 166; var info; var lezydata; var viewall = Lampa.Storage.field('card_views_type') == 'view' || Lampa.Storage.field('navigation_type') == 'mouse'; var background_img = html.find('.full-start__background'); var background_last = ''; var background_timer;
      console.log(LOG_PREFIX + "Component: CONSTRUCTOR called with object:", object);

      // *** Original component.create (EMPTY) ***
      this.create = function () {
          console.log(LOG_PREFIX + "Component: create() called (Original - Empty)");
      };

      this.empty = function () {
        console.log(LOG_PREFIX + "Component: empty() called");
        var button; if (object.source == 'tmdb') { button = $('<div class="empty__footer"><div class="simple-button selector">' + Lampa.Lang.translate('change_source_on_cub') + '</div></div>'); button.find('.selector').on('hover:enter', function () { Lampa.Storage.set('source', 'cub'); Lampa.Activity.replace({ source: 'cub' }); }); } var empty = new Lampa.Empty(); if(html) html.append(empty.render(button)); this.start = empty.start; if(this.activity) this.activity.loader(false); if(this.activity) this.activity.toggle();
      };

      this.loadNext = function () {
        console.log(LOG_PREFIX + "Component: loadNext() START. Wait:", this.next_wait);
        var _this = this; if (this.next && !this.next_wait && items.length) { this.next_wait = true; this.next(function (new_data) { _this.next_wait = false; console.log(LOG_PREFIX + "Component: loadNext() - Received new data:", new_data); var data_to_process = Array.isArray(new_data) ? new_data : (new_data?.results || []); data_to_process.forEach(_this.append.bind(_this)); if (items[active + 1]?.render) { Lampa.Layer.visible(items[active + 1].render(true)); } }, function () { console.warn(LOG_PREFIX + "Component: loadNext() - Error callback."); _this.next_wait = false; }); } else { console.log(LOG_PREFIX + "Component: loadNext() - Conditions not met."); }
      };
      this.push = function () { console.log(LOG_PREFIX + "Component: push() called (No action)."); };

      this.build = function (data) {
            console.log(LOG_PREFIX + "Component: build() START. Received data:", JSON.stringify(data).slice(0, 300) + '...');
            var _this2 = this;
            lezydata = data;
            items = []; // Reset items
            active = 0; // Reset active index

            // --- Original info creation ---
            console.log(LOG_PREFIX + "Component: build() - Creating info instance...");
            // Note: Passing 'object' to create() constructor was in original build.
            info = new create(object);
            info.create();
            console.log(LOG_PREFIX + "Component: build() - Info instance created.");
            // --- End original info creation ---

            // --- Original scroll setup ---
            try {
                 console.log(LOG_PREFIX + "Component: build() - Calling scroll.minus()...");
                 if (!info || typeof info.render !== 'function') throw new Error("'info' or 'info.render' is invalid here.");
                 scroll.minus(info.render()); // Original call
                 console.log(LOG_PREFIX + "Component: build() - scroll.minus() finished.");
            } catch (e) { console.error(LOG_PREFIX + "Component: build() - ERROR during scroll.minus():", e, e.stack); }
            // --- End original scroll setup ---

            // --- Original append logic ---
            var items_to_process = [];
            try {
                 console.log(LOG_PREFIX + "Component: build() - Determining items to process...");
                 // IMPORTANT: How does original handle data? Try slice directly.
                 // If data is {results: [...]}, data.slice will fail.
                 // If data is [ {title:'Row1', results:[]}, ...], data.slice works but passes rows to append.
                 // If data is [ movie1, movie2, ...], data.slice works and passes movies to append.
                 if (Array.isArray(data)) {
                     console.log(LOG_PREFIX + "Component: build() - Data is Array. Slicing directly.");
                     items_to_process = data.slice(0, viewall ? data.length : 2);
                 } else if (data && Array.isArray(data.results)) {
                      console.log(LOG_PREFIX + "Component: build() - Data has results array. Slicing data.results.");
                      items_to_process = data.results.slice(0, viewall ? data.results.length : 2);
                 } else {
                      console.warn(LOG_PREFIX + "Component: build() - Data is not Array or parsable results. Cannot process items for append.");
                      items_to_process = []; // Cannot process
                 }

                 console.log(LOG_PREFIX + "Component: build() - Processing", items_to_process.length, "items for initial append.");
                 scroll.clear();
                 items_to_process.forEach(this.append.bind(this)); // Call append for each item determined above
            } catch (e) { console.error(LOG_PREFIX + "Component: build() - ERROR during data processing/append loop:", e, e.stack); }
            console.log(LOG_PREFIX + "Component: build() - Finished appending initial cards. Total cards:", items.length);
            // --- End original append logic ---

            // Original DOM appends
            if (info?.render && html.children('.new-interface-info').length === 0) html.prepend(info.render());
            if (scroll?.render && html.children('.scroll').length === 0) html.append(scroll.render());

            // Lampa layer/scroll handling (Original)
            if (newlampa) { console.log(LOG_PREFIX + "Component: build() - Setting up Lampa Layer/Scroll."); Lampa.Layer.update(html); Lampa.Layer.visible(scroll.render(true)); scroll.onEnd = this.loadNext.bind(this); scroll.onWheel = function (step) { if (!Lampa.Controller.own(_this2)) _this2.start(); if (step > 0) _this2.down(); else if (active > 0) _this2.up(); }; }

            // Update initial info/background
            if (items.length > 0 && items[0] && items[0].data) {
                 console.log(LOG_PREFIX + "Component: build() - Updating initial info/background for item:", items[0].data?.id);
                 if(info?.update) info.update(items[0].data); else console.error("info.update missing");
                 this.background(items[0].data);
            } else { console.warn(LOG_PREFIX + "Component: build() - No items appended for initial update."); if(info?.empty) info.empty(); }

            this.activity.loader(false); this.activity.toggle();
            console.log(LOG_PREFIX + "Component: build() END.");
      }; // *** End Original component.build ***

      this.background = function (elem) { console.log(LOG_PREFIX + "Component: background() called for:", elem?.id); /* ... original background logic ... */ if (!elem || !elem.backdrop_path) return; var new_background = Lampa.Api.img(elem.backdrop_path, 'w1280'); clearTimeout(background_timer); if (new_background == background_last) return; background_timer = setTimeout(function () { background_img.removeClass('loaded'); background_img[0].onload = function () { background_img.addClass('loaded'); }; background_img[0].onerror = function () { background_img.removeClass('loaded'); }; background_last = new_background; setTimeout(function () { background_img[0].src = background_last; }, 300); }, 1000); };

      // *** Original component.append with logging ***
      this.append = function (element) {
        console.log(LOG_PREFIX + "Component: append() START - Received element:", JSON.stringify(element).slice(0, 100) + '...');
        var _this3 = this;
        // Original script didn't have validation here.
        // It might rely on InteractionLine failing gracefully or on specific data types.

        // Original ready check
        if (element.ready) { console.log(LOG_PREFIX + "Component: append() - Skipping 'ready' element:", element?.id || element?.title); return; }
        element.ready = true;
        if (!element.title && element.name) element.title = element.name;
        if (!element.original_title && element.original_name) element.original_title = element.original_name;

        // Prepare params - use original params
        let line_params = { url: element.url, card_small: true, cardClass: element.cardClass, genres: object.genres, object: object, card_wide: true, nomore: element.nomore };
        console.log(LOG_PREFIX + "Component: append() - Params for InteractionLine:", line_params);

        try {
            console.log(LOG_PREFIX + "Component: append() - Creating InteractionLine with element:", element);
            // *** IMPORTANT: Passing 'element' directly, whatever it is (row or movie?) ***
            var item = new Lampa.InteractionLine(element, line_params);
            item.create();
            console.log(LOG_PREFIX + "Component: append() - InteractionLine CREATED successfully.");

            // Original event handlers
            item.onDown = this.down.bind(this); item.onUp = this.up.bind(this); item.onBack = this.back.bind(this);
            item.onToggle = function () { active = items.indexOf(item); console.log(LOG_PREFIX + "Component append item.onToggle - Active index now:", active); };
            if (this.onMore) item.onMore = this.onMore.bind(this);

            // *** Original onFocus/onHover - logs added ***
            item.onFocus = function (elem) { // Original uses 'elem' argument
                console.log(LOG_PREFIX + "Component append item.onFocus - Received 'elem':", elem);
                // Log what 'elem' actually is here, and what info holds
                console.log(LOG_PREFIX + "Component append item.onFocus - 'info' exists:", !!info);
                // Pass 'elem' directly as original did
                 if (info?.update) info.update(elem); else console.warn("item.onFocus: info.update not ready");
                 _this3.background(elem); // Pass 'elem' directly
            };
            item.onHover = function (elem) { // Original uses 'elem' argument
                 console.log(LOG_PREFIX + "Component append item.onHover - Received 'elem':", elem);
                 if (info?.update) info.update(elem); else console.warn("item.onHover: info.update not ready");
                 _this3.background(elem); // Pass 'elem' directly
            };
            // *** End Original onFocus/onHover ***

            if(info?.empty) item.onFocusMore = info.empty.bind(info);

            scroll.append(item.render()); items.push(item);
            console.log(LOG_PREFIX + "Component: append() END - Success. Total items:", items.length);

        } catch(e) {
             console.error(LOG_PREFIX + "Component: append() - ERROR creating/appending InteractionLine:", e, e.stack);
             // Mark ready to avoid potential loops if data source is static and error is persistent
             element.ready = true;
        }
      }; // *** End Original component.append ***


      this.back = function () { console.log(LOG_PREFIX + "Component: back() called."); Lampa.Activity.backward(); };
      this.down = function () { /* ... original down logic ... */ console.log(LOG_PREFIX + "Component: down() called."); active++; active = Math.min(active, items.length - 1); if(!viewall && lezydata && Array.isArray(lezydata)) { console.log(LOG_PREFIX+"Down - Trying lazy append"); lezydata.slice(0, active + 2).forEach(this.append.bind(this)); } if(items[active]) { items[active].toggle(); if(scroll) scroll.update(items[active].render()); } };
      this.up = function () { /* ... original up logic ... */ console.log(LOG_PREFIX + "Component: up() called."); active--; if (active < 0) { active = 0; Lampa.Controller.toggle('head'); } else { if(items[active]) { items[active].toggle(); if(scroll) scroll.update(items[active].render()); } } };
      this.start = function () { /* ... original start/controller logic ... */ console.log(LOG_PREFIX + "Component: start() called."); var _this4 = this; Lampa.Controller.add('content', { link: this, toggle: function toggle() { console.log(LOG_PREFIX+"Component Controller Toggle:", active); if (_this4.activity?.canRefresh()) return false; if (items.length) { if(items[active]) items[active].toggle(); else if(items[0]) { active=0; items[0].toggle(); } } else { console.log(LOG_PREFIX+"Component Controller Toggle - No items."); } }, update: function update() {}, left: function left() { if (Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); }, right: function right() { Navigator.move('right'); }, up: function up() { if (Navigator.canmove('up')) Navigator.move('up'); else Lampa.Controller.toggle('head'); }, down: function down() { if (Navigator.canmove('down')) Navigator.move('down');}, back: _this4.back.bind(_this4) }); Lampa.Controller.toggle('content'); };
      this.refresh = function () { console.log(LOG_PREFIX + "Component: refresh() called."); this.activity.loader(true); this.activity.need_refresh = true; };
      this.pause = function () { console.log(LOG_PREFIX + "Component: pause() called.");}; this.stop = function () { console.log(LOG_PREFIX + "Component: stop() called.");};
      this.render = function () { console.log(LOG_PREFIX + "Component: render() called."); return html; };
      this.destroy = function () { /* ... original destroy logic ... */ console.log(LOG_PREFIX + "Component: destroy() called."); network.clear(); clearTimeout(background_timer); if(Lampa?.Arrays) Lampa.Arrays.destroy(items); if (scroll) scroll.destroy(); if (info) info.destroy(); if(html) html.remove(); items = null; scroll = null; network = null; lezydata = null; html=null; info=null; object=null; background_img=null; };
    } // --- End Main Component Class ---

    // --- Plugin Initialization ---
    function startPlugin() {
      if (window.plugin_interface_original_logging_ready) { return; }
      window.plugin_interface_original_logging_ready = true;
      console.log('New Interface Plugin (Original+Log): Starting initialization...');
      var old_interface = Lampa.InteractionMain;
      var new_interface = component; // Use component defined above

      if (typeof Lampa.InteractionMain !== 'function') { console.error("New Interface Plugin Error: Lampa.InteractionMain not found."); window.plugin_interface_original_logging_ready = false; return; }

      Lampa.InteractionMain = function (object) { // Original override
        var use = new_interface;
        if (!(object.source == 'tmdb' || object.source == 'cub')) use = old_interface;
        if (window.innerWidth < 767) use = old_interface;
        if (!Lampa.Account.hasPremium()) use = old_interface;
        if (Lampa.Manifest.app_digital < 153) use = old_interface;
        console.log("New Interface Plugin (Original+Log): Using", use === new_interface ? "New Interface" : "Old Interface", "for component:", object?.component);
        return new use(object);
      };

      // Original CSS addition
      var style_tag_id = 'new_interface_style_orig_log';
       Lampa.Template.add('new_interface_style', "\n        <style>\n        .new-interface .card--small.card--wide {\n            width: 18.3em;\n        }\n        \n        .new-interface-info {\n            position: relative;\n            padding: 1.5em;\n            height: 24em;\n        }\n        \n        .new-interface-info__body {\n            width: 80%;\n            padding-top: 1.1em;\n        }\n        \n        .new-interface-info__head {\n            color: rgba(255, 255, 255, 0.6);\n            margin-bottom: 1em;\n            font-size: 1.3em;\n            min-height: 1em;\n        }\n        \n        .new-interface-info__head span {\n            color: #fff;\n        }\n        \n        .new-interface-info__title {\n            font-size: 4em;\n            font-weight: 600;\n            margin-bottom: 0.3em;\n            overflow: hidden;\n            -o-text-overflow: \".\";\n            text-overflow: \".\";\n            display: -webkit-box;\n            -webkit-line-clamp: 1;\n            line-clamp: 1;\n            -webkit-box-orient: vertical;\n            margin-left: -0.03em;\n            line-height: 1.3;\n        }\n        \n        .new-interface-info__details {\n            margin-bottom: 1.6em;\n            display: -webkit-box;\n            display: -webkit-flex;\n            display: -moz-box;\n            display: -ms-flexbox;\n            display: flex;\n            -webkit-box-align: center;\n            -webkit-align-items: center;\n            -moz-box-align: center;\n            -ms-flex-align: center;\n            align-items: center;\n            -webkit-flex-wrap: wrap;\n            -ms-flex-wrap: wrap;\n            flex-wrap: wrap;\n            min-height: 1.9em;\n            font-size: 1.1em;\n        }\n        \n        .new-interface-info__split {\n            margin: 0 1em;\n            font-size: 0.7em;\n        }\n        \n        .new-interface-info__description {\n            font-size: 1.2em;\n            font-weight: 300;\n            line-height: 1.5;\n            overflow: hidden;\n            -o-text-overflow: \".\";\n            text-overflow: \".\";\n            display: -webkit-box;\n            -webkit-line-clamp: 4;\n            line-clamp: 4;\n            -webkit-box-orient: vertical;\n            width: 70%;\n        }\n        \n        .new-interface .card-more__box {\n            padding-bottom: 95%;\n        }\n        \n        .new-interface .full-start__background {\n            height: 108%;\n            top: -6em;\n        }\n        \n        .new-interface .full-start__rate {\n            font-size: 1.3em;\n            margin-right: 0;\n        }\n        \n        .new-interface .card__promo {\n            display: none;\n        }\n        \n        .new-interface .card.card--wide+.card-more .card-more__box {\n            padding-bottom: 95%;\n        }\n        \n        .new-interface .card.card--wide .card-watched {\n            display: none !important;\n        }\n        \n        body.light--version .new-interface-info__body {\n            width: 69%;\n            padding-top: 1.5em;\n        }\n        \n        body.light--version .new-interface-info {\n            height: 25.3em;\n        }\n\n        body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view{\n            animation: animation-card-focus 0.2s\n        }\n        body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view{\n            animation: animation-trigger-enter 0.2s forwards\n        }\n        </style>\n    ");
       var style_element = Lampa.Template.get('new_interface_style', {}, true);
       style_element.attr('id', style_tag_id); // Give it an ID
       if ($('#' + style_tag_id).length === 0) { // Append only if not exists
            $('body').append(style_element);
            console.log(LOG_PREFIX + "Appended original CSS.");
       } else {
            console.log(LOG_PREFIX + "Original CSS already exists.");
       }
       console.log('New Interface Plugin (Original+Log): Initialization complete.');
    }

    // Original init check
    if (!window.plugin_interface_ready) startPlugin(); // Use original flag name

})();
