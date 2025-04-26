// == Original New Interface Script (v12 - Debugging 'info' Initialization) ==

(function () {
    'use strict';

    // --- Info Panel Class ('create' function from original script) ---
    function create() {
      var html; var timer; var network = new Lampa.Reguest(); var loaded = {};
      // console.log("### InfoPanel: CONSTRUCTOR called"); // Log constructor start

      this.create = function () {
        console.log("### InfoPanel: create() method START"); // Log method start
        html = $("<div class=\"new-interface-info\"><div class=\"new-interface-info__body\"><div class=\"new-interface-info__head\"></div><div class=\"new-interface-info__title\"></div><div class=\"new-interface-info__details\"></div><div class=\"new-interface-info__description\"></div></div></div>");
        console.log("### InfoPanel: create() method END - HTML created"); // Log method end
      };

      this.update = function (data) { console.log("### InfoPanel: update() called with data:", data?.id); if (!data || typeof data !== 'object') { return; } if(!html) { console.error("InfoPanel update - HTML missing!"); this.create(); } html.find('.new-interface-info__head,.new-interface-info__details').empty().text('---'); html.find('.new-interface-info__title').text(data.title || data.name || ''); html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext')); this.load(data); };
      this.draw = function (data) { /* ... draw logic with ratings ... */ console.log("### InfoPanel: draw() called with detailed data:", data?.id); if (!html) { console.error("### InfoPanel draw - HTML missing!"); return; } if (!data || typeof data !== 'object' || !data.id) { if(html) html.find('.new-interface-info__details').empty().text('Error loading details.'); return; } var movie_id = data.id; var create_year = ((data.release_date || data.first_air_date || '0000') + '').slice(0, 4); var head = []; var countries = Lampa.Api.sources.tmdb.parseCountries(data); if (create_year !== '0000') head.push('<span>' + create_year + '</span>'); if (countries.length > 0) head.push(countries.join(', ')); html.find('.new-interface-info__head').empty().append(head.join(', ')); var details_container = html.find('.new-interface-info__details').empty(); var rating_elements = []; var other_detail_elements = []; var vote_tmdb = parseFloat((data.vote_average || 0) + '').toFixed(1); if (vote_tmdb > 0) { rating_elements.push('<div class="full-start__rate rate--tmdb"><div>' + vote_tmdb + '</div><div>TMDB</div></div>'); } rating_elements.push('<div class="full-start__rate rate--imdb loading" id="imdb-rating-' + movie_id + '">...</div>'); rating_elements.push('<div class="full-start__rate rate--kp loading" id="kp-rating-' + movie_id + '">...</div>'); var pg = Lampa.Api.sources.tmdb.parsePG(data); if (data.genres?.length > 0) { other_detail_elements.push(data.genres.map(function (item) { return Lampa.Utils.capitalizeFirstLetter(item.name); }).join(' | ')); } if (data.runtime) { other_detail_elements.push(Lampa.Utils.secondsToTime(data.runtime * 60, true)); } if (pg) { other_detail_elements.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + '</span>'); } details_container.append(rating_elements.join('')); var details_splitter = $('<span class="new-interface-info__split details-splitter" style="display: none;">&#9679;</span>'); details_container.append(details_splitter); details_container.append(other_detail_elements.join('<span class="new-interface-info__split">&#9679;</span>')); html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext')); console.log("### InfoPanel draw - Checking Ratings Fetcher..."); if (window.ExternalRatingsFetcher?.fetch) { console.log("### InfoPanel draw - Calling fetch..."); var data_for_fetcher = { id: data.id, title: data.title || data.name, original_title: data.original_title || data.original_name, release_date: data.release_date || data.first_air_date, imdb_id: data.imdb_id }; window.ExternalRatingsFetcher.fetch(data_for_fetcher, function(ratings) { console.log("### InfoPanel draw - Ratings received:", ratings); var imdb_placeholder = html.find('#imdb-rating-' + movie_id); var kp_placeholder = html.find('#kp-rating-' + movie_id); if (!imdb_placeholder.length && !kp_placeholder.length) { return; } imdb_placeholder.removeClass('loading').empty(); kp_placeholder.removeClass('loading').empty(); var kp_rating_str = (ratings.kp && !isNaN(ratings.kp)) ? parseFloat(ratings.kp).toFixed(1) : '0'; var imdb_rating_str = (ratings.imdb && !isNaN(ratings.imdb)) ? parseFloat(ratings.imdb).toFixed(1) : '0'; if (parseFloat(imdb_rating_str) > 0) { imdb_placeholder.append('<div>' + imdb_rating_str + '</div><div>IMDb</div>').show(); } else { imdb_placeholder.hide(); } if (parseFloat(kp_rating_str) > 0) { kp_placeholder.append('<div>' + kp_rating_str + '</div><div>KP</div>').show(); } else { kp_placeholder.hide(); } details_container.find('.rating-splitter, .details-splitter').remove(); var visible_ratings = details_container.find('.full-start__rate:visible'); visible_ratings.each(function(index) { if (index < visible_ratings.length - 1) { $(this).after('<span class="new-interface-info__split rating-splitter">&#9679;</span>'); } }); if (visible_ratings.length > 0 && other_detail_elements.length > 0) { visible_ratings.last().after('<span class="new-interface-info__split details-splitter">&#9679;</span>'); } }); } else { console.error("Ratings Fetcher not found!"); if(html) html.find('#imdb-rating-' + movie_id + ', #kp-rating-' + movie_id).hide(); } };
      this.load = function (data) { console.log("### InfoPanel: load() called for:", data?.id); if (!data || !data.id) { return; } var _this = this; clearTimeout(timer); var media_type = data.name ? 'tv' : 'movie'; var url = Lampa.TMDB.api(media_type + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates,external_ids&language=' + Lampa.Storage.get('language')); if (loaded[url]) { console.log("### InfoPanel load - Cache HIT"); let cached_data = loaded[url]; if (cached_data.external_ids && !cached_data.imdb_id) { cached_data.imdb_id = cached_data.external_ids.imdb_id; } if (!cached_data.title && cached_data.name) { cached_data.title = cached_data.name; } if (!cached_data.original_title && cached_data.original_name) { cached_data.original_title = cached_data.original_name; } this.draw(cached_data); return; } console.log("### InfoPanel load - Cache MISS, fetching:", url); timer = setTimeout(function () { network.clear(); network.timeout(5000); network.silent(url, function (movie_detailed) { console.log("### InfoPanel load - Fetch SUCCESS"); if (movie_detailed.external_ids) { movie_detailed.imdb_id = movie_detailed.external_ids.imdb_id; } if (!movie_detailed.title && movie_detailed.name) { movie_detailed.title = movie_detailed.name; } if (!movie_detailed.original_title && movie_detailed.original_name) { movie_detailed.original_title = movie_detailed.original_name; } loaded[url] = movie_detailed; _this.draw(movie_detailed); }, function(a, c) { console.error("### InfoPanel load - Fetch ERROR:", network.errorDecode(a,c)); if(html) html.find('.new-interface-info__details').empty().text('Error loading details.'); }); }, 100); };
      this.render = function () { return html; };
      this.empty = function () { console.log("### InfoPanel: empty() called"); if(html) { html.find('.rate--kp, .rate--imdb').empty().hide(); html.find('.new-interface-info__head,.new-interface-info__details,.new-interface-info__title,.new-interface-info__description').empty().text(''); } };
      this.destroy = function () { console.log("### InfoPanel: destroy() called"); try { if (html) html.remove(); } catch (e) {} loaded = {}; html = null; network.clear(); };
    } // --- End Info Panel Class ---


    // --- Main Component Class (Original Structure) ---
    function component(object) {
      var network = new Lampa.Reguest(); var scroll = new Lampa.Scroll({ mask: true, over: true, scroll_by_item: true }); var items = []; var html = $('<div class="new-interface"><img class="full-start__background"></div>'); var active = 0; var newlampa = Lampa.Manifest.app_digital >= 166; var info; var lezydata; var viewall = Lampa.Storage.field('card_views_type') == 'view' || Lampa.Storage.field('navigation_type') == 'mouse'; var background_img = html.find('.full-start__background'); var background_last = ''; var background_timer;

      // *** MODIFIED: component.create - Added Logs ***
      this.create = function () {
          console.log("### Component: create() START");
          try {
              info = new create(); // Instantiate info panel controller
              info.create();      // Call its create method to build its HTML
              console.log("### Component: create() - Info instance created successfully.");
          } catch(e) {
              console.error("### Component: create() - ERROR creating info instance:", e);
              info = null; // Ensure info is null if creation failed
          }
          // Do NOT prepend info panel here, do it in build
          console.log("### Component: create() END");
      }; // *** End MODIFIED component.create ***

      this.empty = function () { /* ... original empty logic ... */ console.log("### Component: empty() called"); var button; if (object.source == 'tmdb') { button = $('<div class="empty__footer"><div class="simple-button selector">' + Lampa.Lang.translate('change_source_on_cub') + '</div></div>'); button.find('.selector').on('hover:enter', function () { Lampa.Storage.set('source', 'cub'); Lampa.Activity.replace({ source: 'cub' }); }); } var empty = new Lampa.Empty(); if(html) html.append(empty.render(button)); this.start = empty.start; if(this.activity) this.activity.loader(false); if(this.activity) this.activity.toggle(); };
      this.loadNext = function () { /* ... original load next logic ... */ console.log("### Component: loadNext() called"); var _this = this; if (this.next && !this.next_wait && items.length) { this.next_wait = true; this.next(function (new_data) { _this.next_wait = false; var results = Array.isArray(new_data) ? new_data : (new_data?.results || []); results.forEach(_this.append.bind(_this)); if (items[active + 1]) { Lampa.Layer.visible(items[active + 1].render(true)); } }, function () { _this.next_wait = false; }); } };
      this.push = function () {};

      // *** MODIFIED: component.build - Added checks and logging for info panel ***
      this.build = function (data) {
            console.log("### Component build - START");
            var _this2 = this; items = []; active = 0;

            // --- Ensure info panel HTML is added to main html ---
            // Check if info exists and was created successfully
             if (info && typeof info.render === 'function') {
                  // Check if it's already prepended.
                  if (html.children('.new-interface-info').length === 0) {
                     html.prepend(info.render()); // Prepend the info panel's HTML
                     console.log("### Component build - Info panel prepended.");
                  } else {
                      console.log("### Component build - Info panel already present.");
                  }
             } else {
                  console.error("### Component build - ERROR: 'info' object not ready before prepending. Cannot build component.");
                  this.empty(); // Cannot proceed without info panel
                  return;
             }
            // --- End info panel check/prepend ---

            // --- Find first movie row ---
            var firstMovieRowData = null; var rows_to_process = Array.isArray(data) ? data : (data?.results || []);
            console.log("### Component build - Found", rows_to_process.length, "initial rows.");
            for (let i = 0; i < rows_to_process.length; i++) { let row = rows_to_process[i]; if (row?.results?.length > 0 && row.results[0].id) { console.log("### Component build - Found movie row:", row.title); firstMovieRowData = row.results; lezydata = firstMovieRowData; break; } }
            if (!firstMovieRowData) { console.warn("### Component build - No valid movie row found."); this.empty(); return; }
            console.log("### Component build - Using", firstMovieRowData.length, "movies from first valid row.");
            // --- End Finding Row ---

            // --- Call scroll.minus() AFTER ensuring info exists ---
            try {
                 console.log("### Component build - Calling scroll.minus()...");
                 // Ensure scroll exists - create it if it doesn't (moved from global scope)
                 // Although Lampa usually manages component instances, let's check scroll too
                 if (!scroll || typeof scroll.minus !== 'function') {
                      console.warn("### Component build - Scroll object invalid, creating new one.");
                      scroll = new Lampa.Scroll({ mask: true, over: true, scroll_by_item: true });
                 }
                 // Now attempt scroll.minus
                 scroll.minus(info.render()); // <<<<< Error point
                 console.log("### Component build - scroll.minus() finished.");
            } catch (e) {
                 console.error("### Component build - ERROR during scroll.minus(info.render()):", e, e.stack); // Log stack trace
                 // If scroll.minus fails, maybe the layout won't be quite right, but proceed?
                 // Or call this.empty()? Let's try proceeding.
            }
            // --- End scroll.minus() call ---

            // Append initial cards
            scroll.clear(); // Clear previous cards from scroll if any
            firstMovieRowData.slice(0, viewall ? firstMovieRowData.length : 2).forEach(this.append.bind(this));
            console.log("### Component build - Finished appending initial cards. Total cards:", items.length);

            // Append scroll container
             if (html.children('.scroll').length === 0) { // Check if scroll element is already appended
                html.append(scroll.render());
                console.log("### Component build - Appended scroll container.");
             }


            // Update initial info/background
            if (items.length > 0) {
                 console.log("### Component build - Updating info/background for first card:", items[0].data?.id);
                 // Ensure info.update exists before calling
                 if(info && typeof info.update === 'function') {
                     info.update(items[0].data);
                 } else {
                     console.error("### Component build - info.update not available for initial update.");
                 }
                 this.background(items[0].data);
            } else {
                 console.warn("### Component build - No items appended.");
                 if(info && typeof info.empty === 'function') info.empty();
            }

            // Lampa layer/scroll handling
            if (newlampa) { Lampa.Layer.update(html); Lampa.Layer.visible(scroll.render(true)); scroll.onEnd = this.loadNext.bind(this); scroll.onWheel = function (step) { if (!Lampa.Controller.own(_this2)) _this2.start(); if (step > 0) _this2.down(); else if (active > 0) _this2.up(); }; }

            this.activity.loader(false); this.activity.toggle();
            console.log("### Component build - END.");
      }; // *** End MODIFIED component.build ***

      this.background = function (elem) { console.log("### Component: background() called for:", elem?.id); /* ... original background logic ... */ if (!elem || !elem.backdrop_path) return; var new_background = Lampa.Api.img(elem.backdrop_path, 'w1280'); clearTimeout(background_timer); if (!new_background || new_background === background_last) return; background_timer = setTimeout(function () { background_img.removeClass('loaded'); var img = new Image(); img.onload = function () { if (background_last === new_background) { background_img.attr('src', new_background); background_img.addClass('loaded'); } }; img.onerror = function () { if (background_last === new_background) { background_img.removeClass('loaded').attr('src', ''); background_last = ''; } }; background_last = new_background; img.src = new_background; }, 100); };

      this.append = function (element) { /* ... original append logic with original params ... */ console.log("### Component append - START for:", element?.id); var _this3 = this; if (!element || typeof element !== 'object' || !element.id) { return; } if (items.some(function(itm){ return itm.data?.id === element.id; })) { return; } if (element.ready) return; element.ready = true; if (!element.title && element.name) element.title = element.name; if (!element.original_title && element.original_name) element.original_title = element.original_name; try { var item = new Lampa.InteractionLine(element, { url: element.url, card_small: true, cardClass: element.cardClass, genres: object.genres, object: object, card_wide: true, nomore: element.nomore }); item.create(); item.onDown = this.down.bind(this); item.onUp = this.up.bind(this); item.onBack = this.back.bind(this); item.onToggle = function () { active = items.indexOf(item); }; if (this.onMore) item.onMore = this.onMore.bind(this); item.onFocus = function () { if (info?.update && item.data) { info.update(item.data); _this3.background(item.data); }}; item.onHover = function () { if (info?.update && item.data) { info.update(item.data); _this3.background(item.data); }}; item.onFocusMore = info.empty.bind(info); scroll.append(item.render()); items.push(item); console.log("### Component append - END. Total cards:", items.length); } catch(e) { console.error("### Component append - ERROR creating InteractionLine for:", element.id, e, e.stack); element.ready = true; }};

      this.back = function () { Lampa.Activity.backward(); };
      this.down = function () { /* ... original down logic ... */ console.log("### Component: down() called"); active++; active = Math.min(active, items.length - 1); if(!viewall && lezydata) { /* This lazyload needs fixing if lezydata is only first row */ /* lezydata.slice(0, active + 2).forEach(this.append.bind(this)); */ } if(items[active]) { items[active].toggle(); if(scroll) scroll.update(items[active].render()); } };
      this.up = function () { /* ... original up logic ... */ console.log("### Component: up() called"); active--; if (active < 0) { active = 0; Lampa.Controller.toggle('head'); } else { if(items[active]) { items[active].toggle(); if(scroll) scroll.update(items[active].render()); } } };
      this.start = function () { /* ... original start/controller logic ... */ console.log("### Component: start() called"); var _this4 = this; Lampa.Controller.add('content', { link: this, toggle: function toggle() { console.log("### Component Controller Toggle:", active); if (_this4.activity?.canRefresh()) return false; if (items.length) { if(items[active]) items[active].toggle(); else if(items[0]) { active=0; items[0].toggle(); } } else { console.log("Component Controller Toggle - No items to toggle focus"); } }, update: function update() {}, left: function left() { if (Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); }, right: function right() { Navigator.move('right'); }, up: function up() { _this4.up(); }, down: function down() { _this4.down(); }, back: _this4.back.bind(_this4) }); Lampa.Controller.toggle('content'); };
      this.refresh = function () { this.activity.loader(true); this.activity.need_refresh = true; };
      this.pause = function () {}; this.stop = function () {};
      this.render = function () { return html; };
      this.destroy = function () { /* ... original destroy logic ... */ console.log("### Component: destroy() called"); network.clear(); clearTimeout(background_timer); if(Lampa && Lampa.Arrays) Lampa.Arrays.destroy(items); if (scroll) scroll.destroy(); if (info) info.destroy(); if(html) html.remove(); items = null; scroll = null; network = null; lezydata = null; html=null; info=null; object=null; background_img=null; };
    } // --- End Main Component Class ---

    // --- Plugin Initialization ---
    function startPlugin() { /* ... startPlugin logic ... */ if (window.plugin_new_interface_original_structure_ready) { return; } window.plugin_new_interface_original_structure_ready = true; console.log('New Interface Plugin (Original Structure): Starting initialization...'); var old_interface = Lampa.InteractionMain; var new_interface_component = component; if (typeof Lampa.InteractionMain !== 'function') { console.error("New Interface Plugin Error: Lampa.InteractionMain not found."); window.plugin_new_interface_original_structure_ready = false; return; } Lampa.InteractionMain = function (object) { var use_new_interface = true; if (!object || typeof object !== 'object') use_new_interface = false; else { if (!(object.source == 'tmdb' || object.source == 'cub')) use_new_interface = false; if (window.innerWidth < 767) use_new_interface = false; if (!Lampa.Account.hasPremium()) use_new_interface = false; if (Lampa.Manifest.app_digital < 153) use_new_interface = false; } var InterfaceClass = use_new_interface ? new_interface_component : old_interface; if (typeof InterfaceClass !== 'function') { InterfaceClass = old_interface; if (typeof InterfaceClass !== 'function') return {}; } console.log("New Interface Plugin (Original Structure): Using", use_new_interface ? "New Interface" : "Old Interface", "for component:", object?.component); return new InterfaceClass(object); }; var style_tag_id = 'new-interface-ratings-style'; if ($('#' + style_tag_id).length === 0) { Lampa.Template.add(style_tag_id, `/* CSS */ <style id="${style_tag_id}">.new-interface{display:flex;flex-direction:column; width: 100%; height: 100%;} .new-interface .scroll{flex-grow: 1; overflow-y: auto; padding: 0 1.5em;} .new-interface--rows .items-line{margin-bottom:1.5em} .new-interface .card--small.card--wide{width:18.3em}.new-interface-info{position:relative;padding:1.5em;height:24em;flex-shrink:0}.new-interface-info__body{width:80%;padding-top:1.1em}.new-interface-info__head{color:rgba(255,255,255,.6);margin-bottom:1em;font-size:1.3em;min-height:1em}.new-interface-info__head span{color:#fff}.new-interface-info__title{font-size:4em;font-weight:600;margin-bottom:.3em;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical;margin-left:-.03em;line-height:1.3}.new-interface-info__details{margin-bottom:1.6em;display:flex;align-items:center;flex-wrap:wrap;min-height:1.9em;font-size:1.1em}.new-interface-info__split{margin:0 .8em;font-size:.7em;display:inline-block;vertical-align:middle}.new-interface-info__description{font-size:1.2em;font-weight:300;line-height:1.5;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:4;line-clamp:4;-webkit-box-orient:vertical;width:70%}.new-interface .card-more__box{padding-bottom:95%}.new-interface .full-start__background{position:absolute;left:0;right:0;width:100%;height:108%;top:-6em;object-fit:cover;object-position:center center;opacity:0;transition:opacity .5s ease;z-index:-1}.new-interface .full-start__background.loaded{opacity:1}.new-interface .full-start__rate{font-size:1.3em;margin-right:0;display:inline-flex;flex-direction:column;align-items:center;text-align:center;min-width:3.5em;vertical-align:middle}.new-interface .full-start__rate>div:first-child{font-weight:700;font-size:1.1em}.new-interface .full-start__rate>div:last-child{font-size:.8em;color:rgba(255,255,255,.7);text-transform:uppercase}.new-interface .full-start__rate.loading{min-width:2.5em;color:rgba(255,255,255,.5);justify-content:center;display:inline-flex}.new-interface .full-start__rate.loading>div{display:none}.new-interface .full-start__rate.loading::after{content:'.';animation:dots 1s steps(5,end) infinite;display:inline-block;width:1em;text-align:left;font-size:1.1em;font-weight:700}.new-interface .card__promo{display:none}.new-interface .card.card--wide+.card-more .card-more__box{padding-bottom:95%}.new-interface .card.card--wide .card-watched{display:none!important}body.light--version .new-interface-info__body{width:69%;padding-top:1.5em}body.light--version .new-interface-info{height:25.3em}body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view{animation:animation-card-focus .2s}body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view{animation:animation-trigger-enter .2s forwards}@keyframes dots{0%,20%{color:transparent;text-shadow:.25em 0 0 transparent,.5em 0 0 transparent}40%{color:rgba(255,255,255,.5);text-shadow:.25em 0 0 transparent,.5em 0 0 transparent}60%{text-shadow:.25em 0 0 rgba(255,255,255,.5),.5em 0 0 transparent}80%,to{text-shadow:.25em 0 0 rgba(255,255,255,.5),.5em 0 0 rgba(255,255,255,.5)}}</style>`); $('body').append(Lampa.Template.get(style_tag_id, {}, true)); } console.log('New Interface Plugin (Original Structure): Initialization complete.'); }

    // *** Initialization Logic with Polling ***
    function checkAndInitialize() { var lampaReady = window.Lampa?.Api && Lampa.Utils && Lampa.Storage && Lampa.Template && Lampa.TMDB && Lampa.InteractionMain && Lampa.InteractionLine; var fetcherReady = window.ExternalRatingsFetcher?.fetch; if (lampaReady && fetcherReady) { startPlugin(); return true; } return false; }
    if (!checkAndInitialize()) { var checkInterval = 250; var maxWaitTime = 15000; var timeWaited = 0; var initIntervalTimer = null; console.log('New Interface Plugin (Original Structure): Prerequisites not met. Starting polling...'); initIntervalTimer = setInterval(function() { timeWaited += checkInterval; if (checkAndInitialize()) { clearInterval(initIntervalTimer); } else if (timeWaited >= maxWaitTime) { clearInterval(initIntervalTimer); console.error('New Interface Plugin Error: Timed out waiting for Lampa and/or ExternalRatingsFetcher plugin.'); } }, checkInterval); }

})(); // --- End IIFE ---
