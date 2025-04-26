// == Original New Interface Script + Extensive Logging ONLY ==

(function () {
    'use strict';
    const LOG_PREFIX = "### Original Log - "; // Prefix for clarity

    // --- Info Panel Class ('create' function from original script) ---
    function create() {
      var html;
      var timer;
      var network = new Lampa.Reguest();
      var loaded = {};
      console.log(LOG_PREFIX + "InfoPanel: CONSTRUCTOR called");

      this.create = function () {
        console.log(LOG_PREFIX + "InfoPanel: create() START");
        html = $("<div class=\"new-interface-info\">\n            <div class=\"new-interface-info__body\">\n                <div class=\"new-interface-info__head\"></div>\n                <div class=\"new-interface-info__title\"></div>\n                <div class=\"new-interface-info__details\"></div>\n                <div class=\"new-interface-info__description\"></div>\n            </div>\n        </div>");
        console.log(LOG_PREFIX + "InfoPanel: create() END");
      };

      this.update = function (data) {
        console.log(LOG_PREFIX + "InfoPanel: update() START - Received data:", data?.id, data?.title || data?.name);
        if (!data || typeof data !== 'object') { console.warn(LOG_PREFIX + "InfoPanel update() - Invalid data received."); return; }
        if(!html) { console.error(LOG_PREFIX + "InfoPanel update() - HTML not created!"); this.create(); if(!html) return; } // Safety check

        html.find('.new-interface-info__head,.new-interface-info__details').empty().text('---');
        html.find('.new-interface-info__title').text(data.title || data.name || '');
        html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));
        console.log(LOG_PREFIX + "InfoPanel: update() - Calling load()...");
        this.load(data);
      };

      this.draw = function (data) {
        console.log(LOG_PREFIX + "InfoPanel: draw() START - Received detailed data:", data?.id, data?.title || data?.name);
        if (!html) { console.error(LOG_PREFIX + "InfoPanel draw() - HTML not created!"); return; }
        if (!data || typeof data !== 'object' || !data.id) { console.warn(LOG_PREFIX + "InfoPanel draw() - Invalid detailed data received."); if(html) html.find('.new-interface-info__details').empty().text('Error loading details.'); return; }

        var create = ((data.release_date || data.first_air_date || '0000') + '').slice(0, 4);
        var vote = parseFloat((data.vote_average || 0) + '').toFixed(1);
        var head = [];
        var details = [];
        var countries = Lampa.Api.sources.tmdb.parseCountries(data);
        var pg = Lampa.Api.sources.tmdb.parsePG(data);
        console.log(LOG_PREFIX + "InfoPanel: draw() - Parsed:", { create, vote, countries, pg });

        if (create !== '0000') head.push('<span>' + create + '</span>');
        if (countries.length > 0) head.push(countries.join(', '));

        if (vote > 0) details.push('<div class="full-start__rate"><div>' + vote + '</div><div>TMDB</div></div>'); // Original TMDB rating
        if (data.genres && data.genres.length > 0) { details.push(data.genres.map(function (item) { return Lampa.Utils.capitalizeFirstLetter(item.name); }).join(' | ')); }
        if (data.runtime) { details.push(Lampa.Utils.secondsToTime(data.runtime * 60, true)); }
        if (pg) { details.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + '</span>'); }

        console.log(LOG_PREFIX + "InfoPanel: draw() - Updating DOM elements...");
        html.find('.new-interface-info__head').empty().append(head.join(', '));
        html.find('.new-interface-info__details').html(details.join('<span class="new-interface-info__split">&#9679;</span>'));
        html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));
        console.log(LOG_PREFIX + "InfoPanel: draw() END");
      };

      this.load = function (data) {
        console.log(LOG_PREFIX + "InfoPanel: load() START - Received data:", data?.id, data?.title || data?.name);
        if (!data || !data.id) { console.warn(LOG_PREFIX + "InfoPanel load() - Invalid data."); return; }
        var _this = this;
        clearTimeout(timer);
        var media_type = data.name ? 'tv' : 'movie';
        // *** Original URL without external_ids ***
        var url = Lampa.TMDB.api(media_type + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));
        console.log(LOG_PREFIX + "InfoPanel: load() - TMDB URL:", url);

        if (loaded[url]) { // Check cache
            console.log(LOG_PREFIX + "InfoPanel: load() - Cache HIT.");
             // Ensure title consistency just in case
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

      this.render = function () {
          console.log(LOG_PREFIX + "InfoPanel: render() called.");
          return html;
      };
      this.empty = function () {
          console.log(LOG_PREFIX + "InfoPanel: empty() called.");
          if(html){ html.find('.new-interface-info__head,.new-interface-info__details,.new-interface-info__title,.new-interface-info__description').empty().text(''); }
      };
      this.destroy = function () {
          console.log(LOG_PREFIX + "InfoPanel: destroy() called.");
          if(html) html.remove(); loaded = {}; html = null; network.clear();
      };
    } // --- End Info Panel Class ---


    // --- Main Component Class (Original Structure) ---
    function component(object) {
      var network = new Lampa.Reguest(); var scroll = new Lampa.Scroll({ mask: true, over: true, scroll_by_item: true }); var items = []; var html = $('<div class="new-interface"><img class="full-start__background"></div>'); var active = 0; var newlampa = Lampa.Manifest.app_digital >= 166; var info; var lezydata; var viewall = Lampa.Storage.field('card_views_type') == 'view' || Lampa.Storage.field('navigation_type') == 'mouse'; var background_img = html.find('.full-start__background'); var background_last = ''; var background_timer;
      console.log(LOG_PREFIX + "Component: CONSTRUCTOR called with object:", object);

      this.create = function () {
          console.log(LOG_PREFIX + "Component: create() START");
          info = new create(); // Instantiate original info panel controller
          info.create();
          html.prepend(info.render()); // Prepend info panel
          console.log(LOG_PREFIX + "Component: create() END");
      };

      this.empty = function () {
          console.log(LOG_PREFIX + "Component: empty() called");
          var button; if (object.source == 'tmdb') { button = $('<div class="empty__footer"><div class="simple-button selector">' + Lampa.Lang.translate('change_source_on_cub') + '</div></div>'); button.find('.selector').on('hover:enter', function () { Lampa.Storage.set('source', 'cub'); Lampa.Activity.replace({ source: 'cub' }); }); } var empty = new Lampa.Empty(); if(html) html.append(empty.render(button)); this.start = empty.start; if(this.activity) this.activity.loader(false); if(this.activity) this.activity.toggle();
      };

      this.loadNext = function () {
          console.log(LOG_PREFIX + "Component: loadNext() called. Wait:", this.next_wait);
          var _this = this; if (this.next && !this.next_wait && items.length) { this.next_wait = true; this.next(function (new_data) { _this.next_wait = false; console.log(LOG_PREFIX + "Component: loadNext() - Received new data."); var results = Array.isArray(new_data) ? new_data : (new_data?.results || []); results.forEach(_this.append.bind(_this)); if (items[active + 1]) { Lampa.Layer.visible(items[active + 1].render(true)); } }, function () { console.warn(LOG_PREFIX + "Component: loadNext() - Error callback."); _this.next_wait = false; }); }
      };
      this.push = function () { console.log(LOG_PREFIX + "Component: push() called (No action)."); };

      this.build = function (data) {
            console.log(LOG_PREFIX + "Component: build() START. Received data:", JSON.stringify(data).slice(0, 300) + '...');
            var _this2 = this;
            lezydata = data; // Store original data
            items = []; // Reset items
            active = 0; // Reset active index

            // Determine items to process - ORIGINAL script didn't handle nested rows explicitly here.
            // It assumed 'data' was the list to iterate. Let's log what happens.
            var items_to_process = Array.isArray(data) ? data : (data?.results || data || []); // Try to get a list
            console.log(LOG_PREFIX + "Component: build() - Determined", items_to_process.length, "items to process.");

            // Original scroll setup
             if (!info || typeof info.render !== 'function') { console.error(LOG_PREFIX + "Component: build() - 'info' not ready before scroll.minus!"); this.empty(); return; }
             console.log(LOG_PREFIX + "Component: build() - Calling scroll.minus()...");
             scroll.minus(info.render());
             console.log(LOG_PREFIX + "Component: build() - scroll.minus() finished.");


            // Append initial items - Iterate whatever items_to_process contains
            scroll.clear(); // Clear previous items
            console.log(LOG_PREFIX + "Component: build() - Appending initial items...");
            items_to_process.slice(0, viewall ? items_to_process.length : 2).forEach(this.append.bind(this));
            console.log(LOG_PREFIX + "Component: build() - Finished appending initial cards. Total cards:", items.length);

            // Append scroll container
             if (html.children('.scroll').length === 0) { html.append(scroll.render()); console.log(LOG_PREFIX + "Component: build() - Appended scroll container."); }

            // Update initial info/background
            if (items.length > 0 && items[0] && items[0].data) { // Check item and item.data exist
                 console.log(LOG_PREFIX + "Component: build() - Updating info/background for first card:", items[0].data.id);
                 if(info?.update) info.update(items[0].data); else console.error("info.update missing");
                 this.background(items[0].data);
            } else { console.warn(LOG_PREFIX + "Component: build() - No valid items appended, cannot set initial info/background."); if(info?.empty) info.empty(); }

            // Lampa layer/scroll handling
            if (newlampa) { console.log(LOG_PREFIX + "Component: build() - Setting up new Lampa Layer/Scroll handlers."); Lampa.Layer.update(html); Lampa.Layer.visible(scroll.render(true)); scroll.onEnd = this.loadNext.bind(this); scroll.onWheel = function (step) { if (!Lampa.Controller.own(_this2)) _this2.start(); if (step > 0) _this2.down(); else if (active > 0) _this2.up(); }; }

            this.activity.loader(false); this.activity.toggle();
            console.log(LOG_PREFIX + "Component: build() END.");
      };

      this.background = function (elem) { console.log(LOG_PREFIX + "Component: background() called for:", elem?.id); /* ... original background logic ... */ if (!elem || !elem.backdrop_path) return; var new_background = Lampa.Api.img(elem.backdrop_path, 'w1280'); clearTimeout(background_timer); if (!new_background || new_background === background_last) return; background_timer = setTimeout(function () { background_img.removeClass('loaded'); var img = new Image(); img.onload = function () { if (background_last === new_background) { background_img.attr('src', new_background); background_img.addClass('loaded'); } }; img.onerror = function () { if (background_last === new_background) { background_img.removeClass('loaded').attr('src', ''); background_last = ''; } }; background_last = new_background; img.src = new_background; }, 100); };

      this.append = function (element) {
        console.log(LOG_PREFIX + "Component: append() START - Received element:", JSON.stringify(element).slice(0, 100) + '...');
        var _this3 = this;
        // Original script didn't have strict validation here, let's see what happens
        // if (!element || typeof element !== 'object' || !element.id) { console.warn("Invalid element"); return; }

        if (element.ready) { console.log(LOG_PREFIX + "Component: append() - Skipping 'ready' element."); return; }
        element.ready = true;
        if (!element.title && element.name) element.title = element.name;
        if (!element.original_title && element.original_name) element.original_title = element.original_name;

        // Prepare params for InteractionLine using original values
        let line_params = {
            url: element.url,
            card_small: true,
            cardClass: element.cardClass,
            genres: object.genres, // 'object' is from component constructor
            object: object,        // 'object' is from component constructor
            card_wide: true,
            nomore: element.nomore
        };
        console.log(LOG_PREFIX + "Component: append() - Params for InteractionLine:", line_params);

        try {
            console.log(LOG_PREFIX + "Component: append() - Creating InteractionLine...");
            var item = new Lampa.InteractionLine(element, line_params); // Use Lampa's component
            item.create();
            console.log(LOG_PREFIX + "Component: append() - InteractionLine CREATED successfully for:", element?.id || element?.title);

            // Original event handlers
            item.onDown = this.down.bind(this); item.onUp = this.up.bind(this); item.onBack = this.back.bind(this);
            item.onToggle = function () { active = items.indexOf(item); console.log(LOG_PREFIX + "Component append item.onToggle - Active index now:", active); };
            if (this.onMore) item.onMore = this.onMore.bind(this);

            item.onFocus = function () { console.log(LOG_PREFIX + "Component append item.onFocus:", item.data?.id); if (info?.update && item.data) { info.update(item.data); _this3.background(item.data); }};
            item.onHover = function () { console.log(LOG_PREFIX + "Component append item.onHover:", item.data?.id); if (info?.update && item.data) { info.update(item.data); _this3.background(item.data); }};
            if(info?.empty) item.onFocusMore = info.empty.bind(info);

            scroll.append(item.render()); items.push(item);
            console.log(LOG_PREFIX + "Component: append() END - Success. Total items:", items.length);
        } catch(e) {
            console.error(LOG_PREFIX + "Component: append() - ERROR creating/appending InteractionLine:", e, e.stack);
            // Don't mark ready on error, maybe retry? Or maybe original didn't have try/catch
             element.ready = false; // Allow potential retry?
        }
      };

      this.back = function () { console.log(LOG_PREFIX + "Component: back() called."); Lampa.Activity.backward(); };
      this.down = function () { console.log(LOG_PREFIX + "Component: down() called. Current active:", active); active++; active = Math.min(active, items.length - 1); if(!viewall && lezydata) { /* Original lazyload - might process rows again? */ console.log(LOG_PREFIX+"Down - Lazyload check"); /* lezydata.slice(0, active + 2).forEach(this.append.bind(this)); */ } if(items[active]) { items[active].toggle(); if(scroll) scroll.update(items[active].render()); } console.log(LOG_PREFIX + "Component: down() - New active:", active); };
      this.up = function () { console.log(LOG_PREFIX + "Component: up() called. Current active:", active); active--; if (active < 0) { active = 0; Lampa.Controller.toggle('head'); } else { if(items[active]) { items[active].toggle(); if(scroll) scroll.update(items[active].render()); } } console.log(LOG_PREFIX + "Component: up() - New active:", active); };
      this.start = function () { console.log(LOG_PREFIX + "Component: start() called."); var _this4 = this; Lampa.Controller.add('content', { link: this, toggle: function toggle() { console.log(LOG_PREFIX+"Component Controller Toggle:", active); if (_this4.activity?.canRefresh()) return false; if (items.length) { if(items[active]) items[active].toggle(); else if(items[0]) { active=0; items[0].toggle(); } } else { console.log(LOG_PREFIX+"Component Controller Toggle - No items."); } }, update: function update() {}, left: function left() { if (Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); }, right: function right() { Navigator.move('right'); }, up: function up() { _this4.up(); }, down: function down() { _this4.down(); }, back: _this4.back.bind(_this4) }); Lampa.Controller.toggle('content'); };
      this.refresh = function () { console.log(LOG_PREFIX + "Component: refresh() called."); this.activity.loader(true); this.activity.need_refresh = true; };
      this.pause = function () { console.log(LOG_PREFIX + "Component: pause() called.");}; this.stop = function () { console.log(LOG_PREFIX + "Component: stop() called.");};
      this.render = function () { console.log(LOG_PREFIX + "Component: render() called."); return html; };
      this.destroy = function () { console.log(LOG_PREFIX + "Component: destroy() called."); network.clear(); clearTimeout(background_timer); if(Lampa?.Arrays) Lampa.Arrays.destroy(items); if (scroll) scroll.destroy(); if (info) info.destroy(); if(html) html.remove(); items = null; scroll = null; network = null; lezydata = null; html=null; info=null; object=null; background_img=null; };
    } // --- End Main Component Class ---

    // --- Plugin Initialization ---
    function startPlugin() {
        if (window.plugin_new_interface_original_logging_ready) { return; } // New flag name
        window.plugin_new_interface_original_logging_ready = true;

        console.log('New Interface Plugin (Original+Log): Starting initialization...');
        var old_interface = Lampa.InteractionMain;
        var new_interface_component = component; // Use the component defined above

        if (typeof Lampa.InteractionMain !== 'function') { console.error("New Interface Plugin Error: Lampa.InteractionMain not found."); window.plugin_new_interface_original_logging_ready = false; return; }

        Lampa.InteractionMain = function (object) {
            var use_new_interface = true;
            if (!object || typeof object !== 'object') use_new_interface = false;
            else { if (!(object.source == 'tmdb' || object.source == 'cub')) use_new_interface = false; if (window.innerWidth < 767) use_new_interface = false; if (!Lampa.Account.hasPremium()) use_new_interface = false; if (Lampa.Manifest.app_digital < 153) use_new_interface = false; }

            var InterfaceClass = use_new_interface ? new_interface_component : old_interface;
            if (typeof InterfaceClass !== 'function') { InterfaceClass = old_interface; if (typeof InterfaceClass !== 'function') return {}; }
            console.log("New Interface Plugin (Original+Log): Using", use_new_interface ? "New Interface" : "Old Interface", "for component:", object?.component);
            return new InterfaceClass(object);
        };

        // --- CSS Styles (Keep original - no rating styles needed yet) ---
        Lampa.Template.add('new_interface_style', "\n        <style>\n        .new-interface .card--small.card--wide { width: 18.3em; } .new-interface-info { position: relative; padding: 1.5em; height: 24em; } .new-interface-info__body { width: 80%; padding-top: 1.1em; } .new-interface-info__head { color: rgba(255, 255, 255, 0.6); margin-bottom: 1em; font-size: 1.3em; min-height: 1em; } .new-interface-info__head span { color: #fff; } .new-interface-info__title { font-size: 4em; font-weight: 600; margin-bottom: 0.3em; overflow: hidden; -o-text-overflow: \".\"; text-overflow: \".\"; display: -webkit-box; -webkit-line-clamp: 1; line-clamp: 1; -webkit-box-orient: vertical; margin-left: -0.03em; line-height: 1.3; } .new-interface-info__details { margin-bottom: 1.6em; display: -webkit-box; display: -webkit-flex; display: -moz-box; display: -ms-flexbox; display: flex; -webkit-box-align: center; -webkit-align-items: center; -moz-box-align: center; -ms-flex-align: center; align-items: center; -webkit-flex-wrap: wrap; -ms-flex-wrap: wrap; flex-wrap: wrap; min-height: 1.9em; font-size: 1.1em; } .new-interface-info__split { margin: 0 1em; font-size: 0.7em; } .new-interface-info__description { font-size: 1.2em; font-weight: 300; line-height: 1.5; overflow: hidden; -o-text-overflow: \".\"; text-overflow: \".\"; display: -webkit-box; -webkit-line-clamp: 4; line-clamp: 4; -webkit-box-orient: vertical; width: 70%; } .new-interface .card-more__box { padding-bottom: 95%; } .new-interface .full-start__background { height: 108%; top: -6em; } .new-interface .full-start__rate { font-size: 1.3em; margin-right: 0; } .new-interface .card__promo { display: none; } .new-interface .card.card--wide+.card-more .card-more__box { padding-bottom: 95%; } .new-interface .card.card--wide .card-watched { display: none !important; } body.light--version .new-interface-info__body { width: 69%; padding-top: 1.5em; } body.light--version .new-interface-info { height: 25.3em; } body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view{ animation: animation-card-focus 0.2s } body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view{ animation: animation-trigger-enter 0.2s forwards } </style>\n    ");
        var style_tag = Lampa.Template.get('new_interface_style', {}, true); // Get template jQuery object
             style_tag.attr('id', 'new-interface-style-original-log'); // Add an ID
             if ($('#' + 'new-interface-style-original-log').length === 0) { // Check if not already added
                 $('body').append(style_tag);
             }
        console.log('New Interface Plugin (Original+Log): Initialization complete.');
    }

    // *** Initialization Logic (No Polling Needed Here) ***
    // Assuming original script didn't need polling for external fetcher
    function checkAndInitialize() {
        var lampaReady = window.Lampa?.Api && Lampa.Utils && Lampa.Storage && Lampa.Template && Lampa.TMDB && Lampa.InteractionMain && Lampa.InteractionLine;
        if (lampaReady) { startPlugin(); return true; } return false;
    }
    if (!checkAndInitialize()) {
        var checkInterval = 250; var maxWaitTime = 15000; var timeWaited = 0; var initIntervalTimer = null;
        console.log('New Interface Plugin (Original+Log): Lampa not ready. Starting polling...');
        initIntervalTimer = setInterval(function() { timeWaited += checkInterval; if (checkAndInitialize()) { clearInterval(initIntervalTimer); } else if (timeWaited >= maxWaitTime) { clearInterval(initIntervalTimer); console.error('New Interface Plugin Error: Timed out waiting for Lampa.'); } }, checkInterval);
    }

})();
