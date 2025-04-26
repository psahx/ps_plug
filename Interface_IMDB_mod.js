// == New Interface Script (v9 - Debugging Info Panel/Background Update) ==

(function () {
    'use strict';

    // --- Info Panel Class ---
    function create() {
        var html; var timer; var network = new Lampa.Reguest(); var loaded = {};
        console.log("### InfoPanel: Instance CREATED"); // Log instance creation

        this.create = function () {
            console.log("### InfoPanel: create() called");
            html = $("<div class=\"new-interface-info\"><div class=\"new-interface-info__body\"><div class=\"new-interface-info__head\"></div><div class=\"new-interface-info__title\"></div><div class=\"new-interface-info__details\"></div><div class=\"new-interface-info__description\"></div></div></div>");
        };

        this.update = function (data) {
            console.log("### InfoPanel: update() called with data:", data?.id, data?.title || data?.name);
            if (!data || typeof data !== 'object') { console.warn("InfoPanel update - Invalid data"); return; }
            // Clear panel and show loading state immediately
            if(html) { // Check if html exists
                 html.find('.new-interface-info__head,.new-interface-info__details').empty().text('---');
                 html.find('.new-interface-info__title').text(data.title || data.name || '');
                 html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext')); // Show basic overview first
            } else {
                 console.error("### InfoPanel update - 'html' is not defined!");
                 return;
            }
            this.load(data); // Trigger detailed load
        };

        this.draw = function (data) { // data is the detailed TMDB movie object
             console.log("### InfoPanel: draw() called with detailed data:", data?.id, data?.title || data?.name);
             if (!html) { console.error("### InfoPanel draw - 'html' is not defined!"); return; }
             if (!data || typeof data !== 'object' || !data.id) { html.find('.new-interface-info__details').empty().text('Error loading details.'); return; }

            var movie_id = data.id;
            // --- Head Logic ---
            var create_year = ((data.release_date || data.first_air_date || '0000') + '').slice(0, 4); var head = []; var countries = Lampa.Api.sources.tmdb.parseCountries(data);
            if (create_year !== '0000') head.push('<span>' + create_year + '</span>'); if (countries.length > 0) head.push(countries.join(', '));
            html.find('.new-interface-info__head').empty().append(head.join(', ')); // Update Head

            // --- Details Logic ---
            var details_container = html.find('.new-interface-info__details').empty();
            var rating_elements = []; var other_detail_elements = [];
            var vote_tmdb = parseFloat((data.vote_average || 0) + '').toFixed(1); if (vote_tmdb > 0) { rating_elements.push('<div class="full-start__rate rate--tmdb"><div>' + vote_tmdb + '</div><div>TMDB</div></div>'); }
            rating_elements.push('<div class="full-start__rate rate--imdb loading" id="imdb-rating-' + movie_id + '">...</div>'); rating_elements.push('<div class="full-start__rate rate--kp loading" id="kp-rating-' + movie_id + '">...</div>');
            var pg = Lampa.Api.sources.tmdb.parsePG(data); if (data.genres && data.genres.length > 0) { other_detail_elements.push(data.genres.map(function (item) { return Lampa.Utils.capitalizeFirstLetter(item.name); }).join(' | ')); } if (data.runtime) { other_detail_elements.push(Lampa.Utils.secondsToTime(data.runtime * 60, true)); } if (pg) { other_detail_elements.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + '</span>'); }
            details_container.append(rating_elements.join('')); var details_splitter = $('<span class="new-interface-info__split details-splitter" style="display: none;">&#9679;</span>'); details_container.append(details_splitter); details_container.append(other_detail_elements.join('<span class="new-interface-info__split">&#9679;</span>'));

            // --- Description ---
            html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext')); // Ensure description is updated with detailed data

            // --- Call Fetcher ---
            console.log("### InfoPanel draw - Checking for Ratings Fetcher...");
            if (window.ExternalRatingsFetcher?.fetch) {
                console.log("### InfoPanel draw - Fetcher found, calling fetch...");
                var data_for_fetcher = { id: data.id, title: data.title || data.name, original_title: data.original_title || data.original_name, release_date: data.release_date || data.first_air_date, imdb_id: data.imdb_id };
                window.ExternalRatingsFetcher.fetch(data_for_fetcher, function(ratings) {
                    console.log("### InfoPanel draw - Ratings received in callback:", ratings);
                    var imdb_placeholder = html.find('#imdb-rating-' + movie_id); var kp_placeholder = html.find('#kp-rating-' + movie_id); if (!imdb_placeholder.length && !kp_placeholder.length) { console.warn("InfoPanel ratings callback - Placeholders not found"); return; }
                    imdb_placeholder.removeClass('loading').empty(); kp_placeholder.removeClass('loading').empty();
                    var kp_rating_str = (ratings.kp && !isNaN(ratings.kp)) ? parseFloat(ratings.kp).toFixed(1) : '0'; var imdb_rating_str = (ratings.imdb && !isNaN(ratings.imdb)) ? parseFloat(ratings.imdb).toFixed(1) : '0';
                    if (parseFloat(imdb_rating_str) > 0) { imdb_placeholder.append('<div>' + imdb_rating_str + '</div><div>IMDb</div>').show(); } else { imdb_placeholder.hide(); } if (parseFloat(kp_rating_str) > 0) { kp_placeholder.append('<div>' + kp_rating_str + '</div><div>KP</div>').show(); } else { kp_placeholder.hide(); }
                    details_container.find('.rating-splitter').remove(); var visible_ratings = details_container.find('.full-start__rate:visible'); visible_ratings.each(function(index) { if (index < visible_ratings.length - 1) { $(this).after('<span class="new-interface-info__split rating-splitter">&#9679;</span>'); } }); if (visible_ratings.length > 0 && other_detail_elements.length > 0) { details_splitter.show(); } else { details_splitter.hide(); }
                });
            } else { console.error("### InfoPanel draw - Ratings Fetcher not found!"); if(html) html.find('#imdb-rating-' + movie_id + ', #kp-rating-' + movie_id).hide(); }
        }; // End draw

        this.load = function (data) { // data is the basic card data
            console.log("### InfoPanel: load() called for:", data?.id, data?.title || data?.name);
            if (!data || !data.id) { console.warn("InfoPanel load - Invalid data"); return; }
            var _this = this;
            clearTimeout(timer);
            var media_type = data.name ? 'tv' : 'movie';
            var url = Lampa.TMDB.api(media_type + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates,external_ids&language=' + Lampa.Storage.get('language'));

            if (loaded[url]) { // Check cache
                 console.log("### InfoPanel load - Cache HIT for:", url);
                 let cached_data = loaded[url];
                 if (cached_data.external_ids && !cached_data.imdb_id) { cached_data.imdb_id = cached_data.external_ids.imdb_id; }
                 if (!cached_data.title && cached_data.name) cached_data.title = cached_data.name;
                 if (!cached_data.original_title && cached_data.original_name) cached_data.original_title = cached_data.original_name;
                 this.draw(cached_data); // Draw using cached detailed data
                 return;
            }
             console.log("### InfoPanel load - Cache MISS, fetching:", url);
            timer = setTimeout(function () {
                network.clear(); network.timeout(5000);
                network.silent(url, function (movie_detailed) { // Success
                    console.log("### InfoPanel load - Fetch SUCCESS for:", url);
                    if (movie_detailed.external_ids) { movie_detailed.imdb_id = movie_detailed.external_ids.imdb_id; }
                    if (!movie_detailed.title && movie_detailed.name) movie_detailed.title = movie_detailed.name;
                    if (!movie_detailed.original_title && movie_detailed.original_name) movie_detailed.original_title = movie_detailed.original_name;
                    loaded[url] = movie_detailed; // Add to cache
                    _this.draw(movie_detailed); // Draw with fetched data
                }, function(a, c) { // Error
                    console.error("### InfoPanel load - Fetch ERROR for:", url, network.errorDecode(a,c));
                    if(html) html.find('.new-interface-info__details').empty().text('Error loading details.');
                });
            }, 100); // Shorter delay for loading details
        }; // End load

        this.render = function () { return html; };
        this.empty = function () {
             console.log("### InfoPanel: empty() called");
             if(html) { html.find('.rate--kp, .rate--imdb').empty().hide(); html.find('.new-interface-info__head,.new-interface-info__details,.new-interface-info__title,.new-interface-info__description').empty().text(''); } // Clear all fields
        };
        this.destroy = function () {
             console.log("### InfoPanel: destroy() called");
             try { if (html) html.remove(); } catch (e) {} loaded = {}; html = null; network.clear();
        };
    } // --- End Info Panel Class ---


    // --- Main Component Class ---
    function component(object) {
        var network = new Lampa.Reguest(); var scroll = new Lampa.Scroll({mask:true,over: true,scroll_by_item:true}); var items = [];
        var html = $('<div class="new-interface new-interface--rows"><img class="full-start__background"></div>'); var active = 0; var newlampa = Lampa.Manifest.app_digital >= 166; var info; var lezydata;
        var viewall = Lampa.Storage.field('card_views_type') == 'view' || Lampa.Storage.field('navigation_type') == 'mouse'; var background_img = html.find('.full-start__background'); var background_last = ''; var background_timer;
        var Line = Lampa.InteractionLine;

        if (typeof Line !== 'function') { console.error("New Interface Error: Lampa.InteractionLine component not found!"); this.build = function(data){ this.empty(); console.error("Cannot build: Lampa.InteractionLine missing."); }}

        this.create = function () { info = new create(); info.create(); html.append(info.render()); html.append(scroll.render()); console.log("### Component: create() finished"); };
        this.empty = function () { console.log("### Component: empty() called"); var button; if (object.source == 'tmdb') { button = $('<div class="empty__footer"><div class="simple-button selector">' + Lampa.Lang.translate('change_source_on_cub') + '</div></div>'); button.find('.selector').on('hover:enter', function () { Lampa.Storage.set('source', 'cub'); Lampa.Activity.replace({ source: 'cub' }); }); } var empty = new Lampa.Empty(); if(button) empty.append(button); empty.addInfoButton(); if(scroll) scroll.render().empty(); else $(html).find('.scroll').empty(); if(html) html.find('.new-interface-info').hide(); if(scroll) scroll.append(empty.render(true)); else $(html).append(empty.render(true)); this.start = empty.start; if(this.activity) this.activity.loader(false); if(this.activity) this.activity.toggle(); };
        this.loadNext = function () { console.log("### Component: loadNext() called"); var _this = this; if (this.next && !this.next_wait && items.length && scroll) { this.next_wait = true; this.next(function (new_data) { _this.next_wait = false; var rows = Array.isArray(new_data) ? new_data : (new_data?.results || []); rows.forEach(_this.buildLine.bind(_this)); }, function () { _this.next_wait = false; }); } };

        this.build = function (data) {
            console.log("### Component: build() START"); var _this2 = this; lezydata = data; scroll.clear(); items = []; active = 0;
            var rows_to_process = []; if (Array.isArray(data)) { rows_to_process = data; } else if (data?.results) { rows_to_process = data.results; } console.log("### Component build - Found", rows_to_process.length, "rows.");
            if (rows_to_process.length === 0) { this.empty(); return; }
            rows_to_process.forEach(this.buildLine.bind(this));
            console.log("### Component build - Finished building lines. Total lines:", items.length);
            if (info?.render) info.render().show();
            if (newlampa) { Lampa.Layer.update(html); scroll.onEnd = this.loadNext.bind(this); scroll.onWheel = function (step) { /* Default scroll handles */ }; }
            if (items.length === 0 && rows_to_process.length > 0) { console.warn("### Component build - Rows found, but no valid lines built."); this.empty(); return; }
            this.activity.loader(false); this.activity.toggle();
            console.log("### Component build - END");
        };

        this.buildLine = function(row_data) { // Builds one Line
             if (!row_data || typeof row_data !== 'object' || !Array.isArray(row_data.results)) { return; } if (row_data.results.length === 0 && !row_data.more) { return; }
             console.log("### Component buildLine - Building line for:", row_data.title || "Untitled Row");
             try {
                 let line_params = { object: object, card_small: true, card_wide: true, type: row_data.line_type || 'cards' };
                 var line = new Line(row_data, line_params);
                 // Setup Event Handlers
                 line.onFocus = (card_data)=>{ // Fired when a CARD inside the line gets focus
                     console.log("### Component buildLine line.onFocus - Card focused:", card_data?.id, card_data?.title);
                     if (info && card_data?.id) {
                         info.update(card_data);       // <<<<<< TRIGGER INFO UPDATE
                         this.background(card_data);    // <<<<<< TRIGGER BACKGROUND UPDATE
                     } else if (info) {
                         info.empty();                 // Clear if 'More' etc. focused
                     }
                 };
                 line.onEnter = (target, card_data)=>{ console.log("### Component line.onEnter:", card_data?.id || card_data?.title || 'More Button'); };
                 line.onLeft = ()=>{ console.log("### Component line.onLeft"); Controller.toggle('menu'); };
                 line.onBack = this.back.bind(this);
                 line.onDown = this.down.bind(this);
                 line.onUp = this.up.bind(this);
                 line.create();
                 scroll.append(line.render(true));
                 items.push(line);
             } catch (e) { console.error("### Component buildLine - ERROR creating Line for:", row_data.title, e); }
        };

        this.background = function (elem) {
             console.log("### Component: background() called for:", elem?.id, elem?.title);
             if (!elem || !elem.backdrop_path) { console.log("### Component background - No backdrop path"); return; }
             var new_background = Lampa.Api.img(elem.backdrop_path, 'w1280');
             console.log("### Component background - Setting background to:", new_background);
             clearTimeout(background_timer);
             if (!new_background || new_background === background_last) { console.log("### Component background - No change needed"); return; }
             background_timer = setTimeout(function () {
                background_img.removeClass('loaded'); var img = new Image();
                img.onload = function () { console.log("### Component background - Image loaded"); if (background_last === new_background) { background_img.attr('src', new_background); background_img.addClass('loaded'); } };
                img.onerror = function () { console.log("### Component background - Image error"); if (background_last === new_background) { background_img.removeClass('loaded').attr('src', ''); background_last = ''; } };
                background_last = new_background; img.src = new_background;
             }, 100); // Shorter delay
        };

        this.back = function () { console.log("### Component: back() called"); Lampa.Activity.backward(); };
        this.down = function () { /* ... down logic ... */ if (!items.length || active >= items.length - 1) return; active++; active = Math.min(active, items.length - 1); if (items[active]) { console.log("### Component DOWN - Focusing line index:", active); items[active].toggle(); if(scroll) scroll.update(items[active].render(true), false); } };
        this.up = function () { /* ... up logic ... */ if (!items.length || active <= 0) { Lampa.Controller.toggle('head'); return; } active--; if (items[active]) { console.log("### Component UP - Focusing line index:", active); items[active].toggle(); if(scroll) scroll.update(items[active].render(true), false); } else { Lampa.Controller.toggle('head'); } };
        this.start = function () { /* ... start/controller logic ... */ console.log("### Component: start() called"); var _this4 = this; Lampa.Controller.add('content', { link: this, toggle: function toggle() { console.log("### Component Controller TOGGLE - Focusing line:", active); if (items?.length > 0 && items[active]) { console.log("### Component Controller TOGGLE: Toggling item", active); items[active].toggle(); } else if (items?.length > 0) { console.log("### Component Controller TOGGLE: Active index invalid, focusing item 0"); active = 0; items[0].toggle(); } else { console.log("### Component Controller TOGGLE: No lines ready yet, doing nothing."); } }, left: function left() {}, right: function right() {}, up: this.up.bind(this), down: this.down.bind(this), back: this.back.bind(this) }); Lampa.Controller.toggle('content'); };
        this.refresh = function () { console.log("### Component: refresh() called"); this.activity.loader(true); this.activity.need_refresh = true; };
        this.pause = function () { console.log("### Component: pause() called"); };
        this.stop = function () { console.log("### Component: stop() called"); };
        this.render = function () { return html; };
        this.destroy = function () { console.log("### Component: destroy() called"); try { network.clear(); clearTimeout(background_timer); if (info) info.destroy(); if (items) Lampa.Arrays.destroy(items); items = []; if (scroll) scroll.destroy(); if (html) html.remove(); } catch (e) {} scroll = null; network = null; lezydata = null; html = null; background_img = null; info = null; object = null; };
    } // --- End Main Component Class ---

    // --- Plugin Initialization ---
    function startPlugin() { /* ... startPlugin logic ... */ if (window.plugin_new_interface_with_ratings_ready) { return; } window.plugin_new_interface_with_ratings_ready = true; console.log('New Interface Plugin: Starting initialization...'); var old_interface = Lampa.InteractionMain; var new_interface_component = component; if (typeof Lampa.InteractionMain !== 'function') { console.error("New Interface Plugin Error: Lampa.InteractionMain not found."); window.plugin_new_interface_with_ratings_ready = false; return; } Lampa.InteractionMain = function (object) { var use_new_interface = true; if (!object || typeof object !== 'object') use_new_interface = false; else { if (!(object.source == 'tmdb' || object.source == 'cub')) use_new_interface = false; if (window.innerWidth < 767) use_new_interface = false; if (!Lampa.Account.hasPremium()) use_new_interface = false; if (Lampa.Manifest.app_digital < 153) use_new_interface = false; } var InterfaceClass = use_new_interface ? new_interface_component : old_interface; if (typeof InterfaceClass !== 'function') { InterfaceClass = old_interface; if (typeof InterfaceClass !== 'function') return {}; } return new InterfaceClass(object); }; var style_tag_id = 'new-interface-ratings-style'; if ($('#' + style_tag_id).length === 0) { Lampa.Template.add(style_tag_id, `/* CSS */ <style id="${style_tag_id}">.new-interface{display:flex;flex-direction:column; width: 100%; height: 100%;} .new-interface .scroll{flex-grow: 1; overflow-y: auto; padding: 0 1.5em; /* Add padding to scroll area */} .new-interface--rows .items-line{margin-bottom:1.5em}.new-interface .card--small.card--wide{width:18.3em}.new-interface-info{position:relative;padding:1.5em;height:24em;flex-shrink:0}.new-interface-info__body{width:80%;padding-top:1.1em}.new-interface-info__head{color:rgba(255,255,255,.6);margin-bottom:1em;font-size:1.3em;min-height:1em}.new-interface-info__head span{color:#fff}.new-interface-info__title{font-size:4em;font-weight:600;margin-bottom:.3em;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical;margin-left:-.03em;line-height:1.3}.new-interface-info__details{margin-bottom:1.6em;display:flex;align-items:center;flex-wrap:wrap;min-height:1.9em;font-size:1.1em}.new-interface-info__split{margin:0 .8em;font-size:.7em;display:inline-block;vertical-align:middle}.new-interface-info__description{font-size:1.2em;font-weight:300;line-height:1.5;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:4;line-clamp:4;-webkit-box-orient:vertical;width:70%}.new-interface .card-more__box{padding-bottom:95%}.new-interface .full-start__background{position:absolute;left:0;right:0;width:100%;height:108%;top:-6em;object-fit:cover;object-position:center center;opacity:0;transition:opacity .5s ease;z-index:-1}.new-interface .full-start__background.loaded{opacity:1}.new-interface .full-start__rate{font-size:1.3em;margin-right:0;display:inline-flex;flex-direction:column;align-items:center;text-align:center;min-width:3.5em;vertical-align:middle}.new-interface .full-start__rate>div:first-child{font-weight:700;font-size:1.1em}.new-interface .full-start__rate>div:last-child{font-size:.8em;color:rgba(255,255,255,.7);text-transform:uppercase}.new-interface .full-start__rate.loading{min-width:2.5em;color:rgba(255,255,255,.5);justify-content:center;display:inline-flex}.new-interface .full-start__rate.loading>div{display:none}.new-interface .full-start__rate.loading::after{content:'.';animation:dots 1s steps(5,end) infinite;display:inline-block;width:1em;text-align:left;font-size:1.1em;font-weight:700}.new-interface .card__promo{display:none}.new-interface .card.card--wide+.card-more .card-more__box{padding-bottom:95%}.new-interface .card.card--wide .card-watched{display:none!important}body.light--version .new-interface-info__body{width:69%;padding-top:1.5em}body.light--version .new-interface-info{height:25.3em}body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view{animation:animation-card-focus .2s}body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view{animation:animation-trigger-enter .2s forwards}@keyframes dots{0%,20%{color:transparent;text-shadow:.25em 0 0 transparent,.5em 0 0 transparent}40%{color:rgba(255,255,255,.5);text-shadow:.25em 0 0 transparent,.5em 0 0 transparent}60%{text-shadow:.25em 0 0 rgba(255,255,255,.5),.5em 0 0 transparent}80%,to{text-shadow:.25em 0 0 rgba(255,255,255,.5),.5em 0 0 rgba(255,255,255,.5)}}</style>`); $('body').append(Lampa.Template.get(style_tag_id, {}, true)); } console.log('New Interface Plugin: Initialization complete.'); }

    // *** Initialization Logic with Polling ***
    function checkAndInitialize() { var lampaReady = window.Lampa?.Api && Lampa.Utils && Lampa.Storage && Lampa.Template && Lampa.TMDB && Lampa.InteractionMain && Lampa.InteractionLine; var fetcherReady = window.ExternalRatingsFetcher?.fetch; if (lampaReady && fetcherReady) { startPlugin(); return true; } return false; }
    if (!checkAndInitialize()) { var checkInterval = 250; var maxWaitTime = 15000; var timeWaited = 0; var initIntervalTimer = null; console.log('New Interface Plugin: Prerequisites not met. Starting polling...'); initIntervalTimer = setInterval(function() { timeWaited += checkInterval; if (checkAndInitialize()) { clearInterval(initIntervalTimer); } else if (timeWaited >= maxWaitTime) { clearInterval(initIntervalTimer); console.error('New Interface Plugin Error: Timed out waiting for Lampa and/or ExternalRatingsFetcher plugin.'); } }, checkInterval); }

})(); // --- End IIFE ---
