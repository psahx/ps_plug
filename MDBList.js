// == Lampa Plugin: Enhanced Interface + MDBList (Merged) ==
// Purpose: Single script providing the enhanced interface and integrated MDBList ratings.
//          Replaces the standard Lampa interface component when conditions are met.
// Based on: User's provided "Modified Interface" (#1) and "MDBList_Fetcher" (#2) scripts.
// Version: Final Merged 1.0 (As per explicit instructions)
(function () { // Use standard IIFE
    'use strict';

    const PLUGIN_NAME = "EnhancedInterface-MDBList-Merged-v1.0"; // Added for potential console clarity

    // --- Lampa Readiness Check ---
    // Combine checks potentially needed by both original scripts
    if (!window.Lampa || !window.Lampa.Listener || !window.Lampa.InteractionMain || !window.Lampa.Template || !window.Lampa.Storage || !window.Lampa.Api || !window.Lampa.Utils || !window.Lampa.Lang || !window.Lampa.Reguest || !window.Lampa.Account || !window.Lampa.Manifest || !window.Lampa.SettingsApi || !window.Lampa.Scroll || !window.Lampa.Layer || !window.Lampa.Controller || !window.Lampa.Activity || !window.Lampa.InteractionLine || !window.$) {
        console.error(`${PLUGIN_NAME}: Required Lampa components missing.`);
        return;
    } else {
        // console.log(`${PLUGIN_NAME}: Base Lampa components found.`); // Optional log
    }


    // =========================================================================
    // == Embedded MDBList_Fetcher Logic (Copied from User Script #2) ==
    // =========================================================================

    // --- Fetcher Configuration ---
    var fetcher_config = { // Use var as in original fetcher script
        api_url: 'https://api.mdblist.com/tmdb/',
        // api_key is configured via Lampa Settings -> Additional Ratings
        cache_time: 60 * 60 * 12 * 1000, // 12 hours cache duration
        cache_key: 'mdblist_ratings_cache', // Unique storage key for ratings data
        cache_limit: 500, // Max items in cache
        request_timeout: 10000 // 10 seconds request timeout
    };

    // --- Fetcher Language Strings ---
    // Copied from Fetcher script
    if (window.Lampa && Lampa.Lang) {
        Lampa.Lang.add({
            mdblist_api_key_desc: {
                ru: "Введите ваш API ключ с сайта api.mdblist.com (требуется для MDBLIST_Fetcher)",
                en: "Enter your API key from api.mdblist.com (required for MDBLIST_Fetcher)",
                uk: "Введіть ваш API ключ з сайту api.mdblist.com (потрібно для MDBLIST_Fetcher)"
            }
        });
    }

    // --- Fetcher Settings UI Registration ---
    // Copied from Fetcher script - uses IIFE with flag to prevent multiple registrations
    (function registerFetcherSettings() {
        if (window.fetcherSettingsRegisteredForMerged) return; // Use same flag name for consistency
        // console.log(`${PLUGIN_NAME}: Registering fetcher settings...`); // Keep logs minimal as requested
        try {
            // Add Component (assume Lampa handles duplicates or this runs once)
            Lampa.SettingsApi.addComponent({ component: 'additional_ratings', name: 'Additional Ratings', icon: '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" xml:space="preserve" width="32" height="32" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>' });
            // Add Param (assume Lampa handles duplicates or this runs once)
            Lampa.SettingsApi.addParam({ component: 'additional_ratings', param: { name: 'mdblist_api_key', type: 'input', 'default': '', values: {}, placeholder: 'Enter your MDBList API Key' }, field: { name: 'MDBList API Key', description: Lampa.Lang.translate('mdblist_api_key_desc') }, onChange: function() { Lampa.Settings.update(); } });
            window.fetcherSettingsRegisteredForMerged = true;
        } catch (e) { console.error(`${PLUGIN_NAME}: Error registering fetcher settings`, e); window.fetcherSettingsRegisteredForMerged = true; } // Set flag even on error
    })();


    // --- Fetcher Network Instance ---
    // Use var as in original fetcher script
    var fetcher_network = (window.Lampa && Lampa.Reguest) ? new Lampa.Reguest() : null;

    // --- Fetcher Caching Functions ---
    // Copied directly from Fetcher script
    function getPersistedCache(tmdb_id) {
        if (!window.Lampa || !Lampa.Storage) return false; var timestamp = new Date().getTime(); var cache = Lampa.Storage.cache(fetcher_config.cache_key, fetcher_config.cache_limit, {});
        if (cache[tmdb_id]) { if ((timestamp - cache[tmdb_id].timestamp) > fetcher_config.cache_time) { delete cache[tmdb_id]; Lampa.Storage.set(fetcher_config.cache_key, cache); return false; } return cache[tmdb_id].data; } return false;
    }
    function setPersistedCache(tmdb_id, data) {
        if (!window.Lampa || !Lampa.Storage) return; var timestamp = new Date().getTime(); var cache = Lampa.Storage.cache(fetcher_config.cache_key, fetcher_config.cache_limit, {});
        cache[tmdb_id] = { timestamp: timestamp, data: data }; Lampa.Storage.set(fetcher_config.cache_key, cache);
    }

    // --- Core Fetching Logic Function (Embedded) ---
    // Copied directly from Fetcher script
    function fetchRatings(movieData, callback) {
        if (!fetcher_network) { console.error(`${PLUGIN_NAME}: Fetcher network component unavailable.`); if (callback) callback({ error: "Network component unavailable" }); return; }
        if (!window.Lampa || !Lampa.Storage) { console.error(`${PLUGIN_NAME}: Lampa.Storage not available for fetcher.`); if (callback) callback({ error: "Storage component unavailable" }); return; }
        if (!movieData || !movieData.id || !movieData.method || !callback) { console.error(`${PLUGIN_NAME}: Invalid input to fetchRatings.`); if (callback) callback({ error: "Invalid input data" }); return; }
        var tmdb_id = movieData.id; var cached_ratings = getPersistedCache(tmdb_id); if (cached_ratings) { callback(cached_ratings); return; }
        var apiKey = Lampa.Storage.get('mdblist_api_key'); if (!apiKey) { callback({ error: "MDBList API Key not configured in Additional Ratings settings" }); return; }
        var media_type = movieData.method === 'tv' ? 'show' : 'movie'; var api_url = "".concat(fetcher_config.api_url).concat(media_type, "/").concat(tmdb_id, "?apikey=").concat(apiKey);
        fetcher_network.clear(); fetcher_network.timeout(fetcher_config.request_timeout);
        fetcher_network.silent(api_url, function (response) {
            var ratingsResult = { error: null };
            if (response && response.ratings && Array.isArray(response.ratings)) { response.ratings.forEach(function(rating) { if (rating.source && rating.value !== null) { ratingsResult[rating.source] = rating.value; } }); }
            else if (response && response.error) { console.error(`${PLUGIN_NAME}: API Error from MDBList for ID:`, tmdb_id, response.error); ratingsResult.error = "MDBList API Error: " + response.error; }
            else { console.error(`${PLUGIN_NAME}: Invalid response format from MDBList for ID:`, tmdb_id); ratingsResult.error = "Invalid response format from MDBList"; }
            if (ratingsResult.error === null || (ratingsResult.error && !ratingsResult.error.toLowerCase().includes("invalid api key"))) { setPersistedCache(tmdb_id, ratingsResult); }
            callback(ratingsResult);
        }, function (xhr, status) {
            var errorMessage = "MDBList request failed"; if (status) { errorMessage += " (Status: " + status + ")"; } console.error(`${PLUGIN_NAME}:`, errorMessage, "for ID:", tmdb_id); var errorResult = { error: errorMessage };
            if (status !== 401 && status !== 403) { setPersistedCache(tmdb_id, errorResult); } callback(errorResult);
        });
    }
    // console.log(`${PLUGIN_NAME}: Embedded MDBList_Fetcher logic defined.`); // Optional log


    // =========================================================================
    // == Enhanced Interface Logic (Copied from User Script #1) ==
    // =========================================================================
    // console.log(`${PLUGIN_NAME}: Defining enhanced interface logic...`); // Optional log

    // --- Interface State (In-memory cache for view session) ---
    // These names come from the user's Modified Interface script
    var mdblistRatingsCache = {};
    var mdblistRatingsPending = {};

    // --- Interface Logo URLs ---
    // Defined as constants in the user's Modified Interface script
    const imdbLogoUrl = 'https://psahx.github.io/ps_plug/IMDb_3_2_Logo_GOLD.png';
    const tmdbLogoUrl = 'https://psahx.github.io/ps_plug/TMDB.svg';
    const rtFreshLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes.svg';
    const rtRottenLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes_rotten.svg';


    // --- Info Panel Constructor (`create` function from Modified Interface script) ---
    function create() { // Using original name 'create' as in user script
      // Using var as in user script
      var html; var timer; var network = new Lampa.Reguest(); var loaded = {};
      // Assign instance properties - this is necessary for methods to access them
      this.html = html; this.timer = timer; this.network = network; this.loaded = loaded;

      // create method - Copied directly
      this.create = function () { html = $("<div class=\"new-interface-info\">\n            <div class=\"new-interface-info__body\">\n                <div class=\"new-interface-info__head\"></div>\n                <div class=\"new-interface-info__title\"></div>\n                <div class=\"new-interface-info__details\"></div>\n                <div class=\"new-interface-info__description\"></div>\n            </div>\n        </div>"); this.html = html; }; // Assign html again just in case

      // update method - Copied, with fetch call modified
      this.update = function (data) {
          var _this = this; // Keep original var name
          // Use instance properties directly e.g., this.html
          this.html.find('.new-interface-info__head,.new-interface-info__details').text('---');
          this.html.find('.new-interface-info__title').text(data.title);
          this.html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));
          Lampa.Background.change(Lampa.Api.img(data.backdrop_path, 'w200'));
          // Use the in-memory view cache variables defined above
          delete mdblistRatingsCache[data.id]; delete mdblistRatingsPending[data.id];

          // ** THE ONLY MODIFICATION: Call embedded fetchRatings directly **
          if (data.id && data.method) { // Removed check for window.MDBLIST_Fetcher
              mdblistRatingsPending[data.id] = true;
              fetchRatings(data, function(mdblistResult) { // <<<<< CHANGED HERE
                  mdblistRatingsCache[data.id] = mdblistResult;
                  delete mdblistRatingsPending[data.id];
                  // Use instance properties for TMDB cache check
                  var tmdb_url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));
                  if (_this.loaded[tmdb_url]) { _this.draw(_this.loaded[tmdb_url]); }
              });
          } else if (!data.method) { /* Optional warning */ console.warn(`${PLUGIN_NAME}: data.method missing in update.`); }
          this.load(data); // Call instance load
      }; // End update

      // draw method - Copied directly (uses in-memory mdblistRatingsCache)
      this.draw = function (data) {
          var createYear = ((data.release_date || data.first_air_date || '0000') + '').slice(0, 4); var vote = parseFloat((data.vote_average || 0) + '').toFixed(1); var head = []; var details = []; var countries = Lampa.Api.sources.tmdb.parseCountries(data); var pg = Lampa.Api.sources.tmdb.parsePG(data); /* Logos defined globally */ if (createYear !== '0000') head.push('<span>' + createYear + '</span>'); if (countries.length > 0) head.push(countries.join(', ')); var mdblistResult = mdblistRatingsCache[data.id]; var imdbRating = '---'; if(mdblistResult && mdblistResult.error === null && mdblistResult.imdb !== undefined && mdblistResult.imdb !== null && typeof mdblistResult.imdb === 'number') {imdbRating = parseFloat(mdblistResult.imdb || 0).toFixed(1);} else if (mdblistResult?.error){imdbRating = 'ERR';} details.push('<div class="full-start__rate imdb-rating-item"><div>' + imdbRating + '</div><img src="' + imdbLogoUrl + '" class="rating-logo imdb-logo" alt="IMDB" draggable="false"></div>'); details.push('<div class="full-start__rate tmdb-rating-item"><div>' + vote + '</div><img src="' + tmdbLogoUrl + '" class="rating-logo tmdb-logo" alt="TMDB" draggable="false"></div>'); if (mdblistResult && mdblistResult.error === null && mdblistResult.tomatoes !== undefined && typeof mdblistResult.tomatoes === 'number' && mdblistResult.tomatoes !== null) { let score = mdblistResult.tomatoes; let logoUrl = ''; if (score >= 60) { logoUrl = rtFreshLogoUrl; } else if (score >= 0) { logoUrl = rtRottenLogoUrl; } if (logoUrl) { details.push('<div class="full-start__rate rt-rating-item"><div class="rt-score">' + score + '%</div><img src="' + logoUrl + '" class="rating-logo rt-logo" alt="RT Status" draggable="false"></div>'); } } if (data.genres && data.genres.length > 0) details.push(data.genres.map(function (item) { return Lampa.Utils.capitalizeFirstLetter(item.name); }).join(' | ')); if (data.runtime) details.push(Lampa.Utils.secondsToTime(data.runtime * 60, true)); if (pg) details.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + '</span>'); this.html.find('.new-interface-info__head').empty().append(head.join(', ')); this.html.find('.new-interface-info__details').empty().html(details.join('<span class="new-interface-info__split">&#9679;</span>'));
      }; // End draw

      // load method - Copied directly (fetches TMDB details)
      this.load = function (data) {
           var _this = this; clearTimeout(_this.timer); var url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language')); if (_this.loaded[url]) { /* Ensure method for draw */ if(!_this.loaded[url].method) _this.loaded[url].method = data.name?'tv':'movie'; return _this.draw(_this.loaded[url]); } _this.timer = setTimeout(function () { if(!_this.network) return; _this.network.clear(); _this.network.timeout(5000); _this.network.silent(url, function (movie) { if(!_this.loaded) return; _this.loaded[url] = movie; if (!movie.method) movie.method = data.name ? 'tv' : 'movie'; _this.draw(movie); }); }, 300);
      }; // End load

      // render method - Copied directly
      this.render = function () { return this.html; }; // Use instance html
      // empty method - Copied directly
      this.empty = function () {};
      // destroy method - Copied directly (clears in-memory cache)
      this.destroy = function () {
          if(this.html) this.html.remove(); this.loaded = {}; this.html = null;
          // Also clear instance network/timer if they were created by this instance
          if (this.network) this.network.clear(); clearTimeout(this.timer); this.network = null; this.timer = null;
          // Clear plugin's global in-memory caches
          mdblistRatingsCache = {}; mdblistRatingsPending = {};
      }; // End destroy
    } // End create function definition


    // --- Main Component Constructor (`component` function from Modified Interface script) ---
    function component(object) { // Using original name 'component'
        // Using var as in user script
        var network = new Lampa.Reguest(); var scroll = new Lampa.Scroll({ mask: true, over: true, scroll_by_item: true }); var items = []; var html = $('<div class="new-interface"><img class="full-start__background"></div>'); var active = 0; var newlampa = Lampa.Manifest.app_digital >= 166; var info; var lezydata; var viewall = Lampa.Storage.field('card_views_type') == 'view' || Lampa.Storage.field('navigation_type') == 'mouse'; var background_img = html.find('.full-start__background'); var background_last = ''; var background_timer;
        // Assign instance properties needed by methods
        this.network = network; this.scroll = scroll; this.items = items; this.html = html; this.active = active; this.newlampa = newlampa; this.lazydata = lezydata; /* fixed typo */ this.viewall = viewall; this.background_img = background_img; this.background_last = background_last; this.background_timer = background_timer; this.object = object; this.info = info; // will be instance of 'create'

        // Assign 'create' function (defined above) to instance create property
        // This matches structure where build calls 'new this.create()'
        this.create = create;

        // All other methods (empty, loadNext, push, build, background, append, back, down, up, start, refresh, pause, stop, render, destroy) are copied directly from user's Script #1 ('Modified Interface')
        this.empty = function () { var t; if(this.object.source=="tmdb"){t=$('<div class="empty__footer"><div class="simple-button selector">'+Lampa.Lang.translate("change_source_on_cub")+"</div></div>");t.find(".selector").on("hover:enter",function(){Lampa.Storage.set("source","cub");Lampa.Activity.replace({source:"cub"})})} var a=new Lampa.Empty;this.html.append(a.render(t));this.start=a.start;if(this.activity){this.activity.loader(!1);this.activity.toggle()} };
        this.loadNext = function () { var t=this; if(t.next&&!t.next_wait&&t.items.length){t.next_wait=!0;t.next(function(e){t.next_wait=!1;e.forEach(t.append.bind(t));if(t.items[t.active+1])Lampa.Layer.visible(t.items[t.active+1].render(!0))},function(){t.next_wait=!1})} };
        this.push = function () {};
        this.build = function (data) { var t=this; t.lazydata=data; if(typeof t.create!="function"){console.error("Build Error: this.create is not function"); t.info=null} else {t.info=new t.create(t.object); t.info.create()} if(t.info)t.scroll.minus(t.info.render()); data.slice(0,t.viewall?data.length:2).forEach(t.append.bind(t)); if(t.info)t.html.append(t.info.render()); t.html.append(t.scroll.render()); if(t.newlampa){Lampa.Layer.update(t.html);Lampa.Layer.visible(t.scroll.render(!0));t.scroll.onEnd=t.loadNext.bind(t);t.scroll.onWheel=function(e){if(!Lampa.Controller.own(t))t.start();if(e>0)t.down();else if(t.active>0)t.up()}} if(t.items.length>0&&t.items[0]&&t.items[0].data&&t.info){t.active=0;if(!t.items[0].data.method)t.items[0].data.method=t.items[0].data.name?"tv":"movie";t.info.update(t.items[0].data);t.background(t.items[0].data)} if(t.activity){t.activity.loader(!1);t.activity.toggle()} };
        this.background = function (elem) { var t=this; if(!elem||!elem.backdrop_path)return; var a=Lampa.Api.img(elem.backdrop_path,"w1280"); clearTimeout(t.background_timer); if(a==t.background_last)return; t.background_timer=setTimeout(function(){if(!t.background_img||!t.background_img.length)return; t.background_img.removeClass("loaded"); if(t.background_img[0]){t.background_img[0].onload=()=>{if(t.background_img)t.background_img.addClass("loaded")}; t.background_img[0].onerror=()=>{if(t.background_img)t.background_img.removeClass("loaded")}; t.background_last=a; setTimeout(()=>{if(t.background_img&&t.background_img[0])t.background_img[0].src=t.background_last},300)} }.bind(t),1e3) };
        this.append = function (element) { var t=this; if(element.ready)return; element.ready=!0; var a=new Lampa.InteractionLine(element,{url:element.url,card_small:!0,cardClass:element.cardClass,genres:t.object.genres,object:t.object,card_wide:!0,nomore:element.nomore}); a.create(); a.onDown=t.down.bind(t); a.onUp=t.up.bind(t); a.onBack=t.back.bind(t); a.onToggle=function(){t.active=t.items.indexOf(a)}; if(t.onMore)a.onMore=t.onMore.bind(t); a.onFocus=function(e){if(!e.method)e.method=e.name?"tv":"movie"; if(t.info)t.info.update(e); t.background(e)}; a.onHover=function(e){if(!e.method)e.method=e.name?"tv":"movie"; if(t.info)t.info.update(e); t.background(e)}; if(t.info&&typeof t.info.empty=="function")a.onFocusMore=t.info.empty.bind(t.info); t.scroll.append(a.render()); t.items.push(a) };
        this.back = function () { Lampa.Activity.backward(); };
        this.down = function () { this.active++; this.active = Math.min(this.active, this.items.length - 1); if (!this.viewall && this.lazydata) this.lazydata.slice(0, this.active + 2).forEach(this.append.bind(this)); if(this.items[this.active]){ this.items[this.active].toggle(); this.scroll.update(this.items[this.active].render()); } };
        this.up = function () { this.active--; if (this.active < 0) { this.active = 0; Lampa.Controller.toggle('head'); } else { if(this.items[this.active]){ this.items[this.active].toggle(); this.scroll.update(this.items[this.active].render()); } } };
        this.start = function () { var t=this; Lampa.Controller.add("content",{link:t,toggle:function(){if(t.activity&&t.activity.canRefresh())return!1;if(t.items.length&&t.items[t.active])t.items[t.active].toggle()},update:function(){},left:function(){if(Navigator.canmove("left"))Navigator.move("left");else Lampa.Controller.toggle("menu")},right:function(){Navigator.move("right")},up:function(){if(Navigator.canmove("up"))Navigator.move("up");else Lampa.Controller.toggle("head")},down:function(){if(Navigator.canmove("down"))Navigator.move("down")},back:t.back}); Lampa.Controller.toggle("content") };
        this.refresh = function () { if(this.activity){ this.activity.loader(true); this.activity.need_refresh = true; } };
        this.pause = function () {}; this.stop = function () {};
        this.render = function () { return this.html; };
        this.destroy = function () { var t=this; clearTimeout(t.background_timer); if(t.network)t.network.clear(); if(Array.isArray(t.items))Lampa.Arrays.destroy(t.items); if(t.scroll)t.scroll.destroy(); if(t.info)t.info.destroy(); if(t.html)t.html.remove(); t.items=null; t.network=null; t.lazydata=null; t.info=null; t.html=null; t.background_timer=null; t.scroll=null; t.background_img=null; t.object=null; t.activity=null; };

        // No explicit call to createOnInit needed as instance vars assigned directly above
    } // End component function definition


    // --- Plugin Initialization Logic (Copied from Modified Interface script) ---
    function startPlugin() {
        // console.log(`${PLUGIN_NAME}: startPlugin() called.`); // Optional log
        // Readiness check from original startPlugin
        if (!window.Lampa || !Lampa.Utils || !Lampa.Lang || !Lampa.Storage || !Lampa.TMDB || !Lampa.Template || !Lampa.Reguest || !Lampa.Api || !Lampa.InteractionLine || !Lampa.Scroll || !Lampa.Activity || !Lampa.Controller || !Lampa.Account || !Lampa.Manifest) {
             console.error(`${PLUGIN_NAME}: Missing Lampa components in startPlugin.`); return;
        }
        // Add Lang string if not added by fetcher part
        if (!Lampa.Lang.exist('full_notext')) { Lampa.Lang.add({ full_notext: { en: 'No description', ru: 'Нет описания'} }); }

        // Don't set global flag, not needed if standalone
        // window.plugin_interface_ready = true;

        var old_interface = Lampa.InteractionMain; // Capture Lampa's default
        var new_interface = component; // Use the 'component' function defined above

        // Replace Lampa.InteractionMain with the conditional factory logic
        Lampa.InteractionMain = function (object) {
            console.log(`${PLUGIN_NAME}: Factory function running for source:`, object?.source);
            var use_interface_constructor = new_interface; // Default to our enhanced one
            // Apply conditions from original wrapper
            if (!(object.source == 'tmdb' || object.source == 'cub')) use_interface_constructor = old_interface;
            if (window.innerWidth < 767) use_interface_constructor = old_interface;
            if (!Lampa.Account.hasPremium()) use_interface_constructor = old_interface;
            if (Lampa.Manifest.app_digital < 153) use_interface_constructor = old_interface;
            console.log(`${PLUGIN_NAME}: Using ${use_interface_constructor === new_interface ? 'Enhanced' : 'Original/Default'} component.`);
            // Instantiate the chosen component constructor
            try {
                 // Ensure the chosen constructor is valid before using 'new'
                 if (typeof use_interface_constructor === 'function') {
                     return new use_interface_constructor(object);
                 } else {
                      console.error(`${PLUGIN_NAME}: Chosen interface constructor is not a function! Falling back.`);
                      // Fallback safely
                      if (typeof old_interface === 'function') return new old_interface(object);
                      else return null; // Absolute fallback
                 }
            } catch (e) {
                 console.error(`${PLUGIN_NAME}: Error instantiating component!`, e);
                  // Fallback safely
                 if (typeof old_interface === 'function') {
                      try { return new old_interface(object); } catch(fe) { return null;}
                 } else { return null; }
            }
        };
         console.log(`${PLUGIN_NAME}: Lampa.InteractionMain replaced by enhanced factory.`);

        // CSS Injection (Using function defined above)
        injectCSS();

    } // End startPlugin

    // --- Trigger Initialization ---
    // Use Lampa listener to call startPlugin after Lampa is ready
    Lampa.Listener.follow('app', (e) => {
        if (e.type == 'ready') {
            console.log(`${PLUGIN_NAME}: App ready event received. Running startPlugin...`);
            startPlugin();
            console.log(`${PLUGIN_NAME}: Initialization sequence complete.`);
        }
    });

})(); // End IIFE
