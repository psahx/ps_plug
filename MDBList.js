// == Lampa Plugin: Enhanced Interface + MDBList (Merged) ==
// Purpose: Single script providing the enhanced interface and integrated MDBList ratings.
//          Replaces the standard Lampa/CUB interface component when conditions are met.
// Based on: User's provided "Modified Interface" and "MDBList_Fetcher" scripts.
// Version: Final Merged 1.0
(function () { // Use standard IIFE
    'use strict';

    const PLUGIN_NAME = "EnhancedInterface-MDBList-v1.0";

    // --- Lampa Readiness Check ---
    if (!window.Lampa || !window.Lampa.Listener || !window.Lampa.InteractionMain || !window.Lampa.Template || !window.Lampa.Storage || !window.Lampa.Api || !window.Lampa.Utils || !window.Lampa.Lang || !window.Lampa.Reguest || !window.Lampa.Account || !window.Lampa.Manifest || !window.Lampa.SettingsApi || !window.Lampa.Scroll || !window.Lampa.Layer || !window.Lampa.Controller || !window.Lampa.Activity || !window.Lampa.InteractionLine || !window.$) {
        console.error(`${PLUGIN_NAME}: Required Lampa components missing.`);
        return;
    } else {
        console.log(`${PLUGIN_NAME}: Base Lampa components found.`);
    }

    // =========================================================================
    // == Embedded MDBList_Fetcher Logic ==
    // =========================================================================
    console.log(`${PLUGIN_NAME}: Defining embedded MDBList_Fetcher logic...`);

    // --- Fetcher Configuration ---
    const fetcher_config = {
        api_url: 'https://api.mdblist.com/tmdb/',
        cache_time: 60 * 60 * 12 * 1000, // 12 hours persisted cache duration
        cache_key: 'mdblist_ratings_cache', // Storage key for persisted ratings data
        cache_limit: 500, // Max items in persisted cache
        request_timeout: 10000 // 10 seconds request timeout
    };

    // --- Fetcher Language Strings & Settings UI ---
    // Encapsulate registration to run once
    (function registerFetcherSettings() {
        // Use flag to prevent multiple registrations if script somehow runs twice
        if (window.fetcherSettingsRegisteredForMerged) return;

        console.log(`${PLUGIN_NAME}: Registering fetcher settings...`);
        try {
            Lampa.Lang.add({
                mdblist_api_key_desc: {
                    ru: "Введите ваш API ключ с сайта api.mdblist.com (требуется для встроенного MDBList Fetcher)",
                    en: "Enter your API key from api.mdblist.com (required for built-in MDBList Fetcher)",
                    uk: "Введіть ваш API ключ з сайту api.mdblist.com (потрібно для вбудованого MDBList Fetcher)"
                }
            });

            // Add Component (assume Lampa handles duplicates or this runs once)
            Lampa.SettingsApi.addComponent({
                component: 'additional_ratings',
                name: 'Additional Ratings',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" xml:space="preserve" width="32" height="32" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>'
            });
            console.log(`${PLUGIN_NAME}: addComponent 'additional_ratings' called.`);

            // Add Param (assume Lampa handles duplicates or this runs once)
            Lampa.SettingsApi.addParam({
                component: 'additional_ratings',
                param: { name: 'mdblist_api_key', type: 'input', 'default': '', values: {}, placeholder: 'Enter your MDBList API Key' },
                field: { name: 'MDBList API Key', description: Lampa.Lang.translate('mdblist_api_key_desc') },
                onChange: function() { Lampa.Settings.update(); }
            });
            console.log(`${PLUGIN_NAME}: addParam 'mdblist_api_key' called.`);

            window.fetcherSettingsRegisteredForMerged = true; // Set flag
        } catch (e) {
            console.error(`${PLUGIN_NAME}: Error registering fetcher settings (non-fatal)`, e);
            // Set flag even on error to prevent repeated attempts
            window.fetcherSettingsRegisteredForMerged = true;
        }
    })();


    // --- Fetcher Network Instance ---
    const fetcher_network = new Lampa.Reguest();

    // --- Fetcher Caching Functions (Using Lampa Storage for Persisted Cache) ---
    function getPersistedCache(tmdb_id) {
        try { var t=new Date().getTime(),a=Lampa.Storage.cache(fetcher_config.cache_key,fetcher_config.cache_limit,{});if(a[tmdb_id]){if(t-a[tmdb_id].timestamp>fetcher_config.cache_time)return delete a[tmdb_id],Lampa.Storage.set(fetcher_config.cache_key,a),!1;return a[tmdb_id].data}}catch(e){console.error(`${PLUGIN_NAME} Fetcher: Err get cache`,e)}return!1;
     }
    function setPersistedCache(tmdb_id, data) {
        try { var t=new Date().getTime(),a=Lampa.Storage.cache(fetcher_config.cache_key,fetcher_config.cache_limit,{});a[tmdb_id]={timestamp:t,data:data},Lampa.Storage.set(fetcher_config.cache_key,a)}catch(e){console.error(`${PLUGIN_NAME} Fetcher: Err set cache`,e)}
     }

    // --- Core Fetching Logic Function (Embedded) ---
    function fetchRatings(movieData, callback) {
        // console.debug(`${PLUGIN_NAME} Fetcher: fetchRatings called for ID:`, movieData?.id);
        if (!movieData || !movieData.id || !movieData.method || !callback) { if (callback) callback({ error: "Invalid input data" }); return; }
        var tmdb_id = movieData.id;
        var cached_ratings = getPersistedCache(tmdb_id); if (cached_ratings) { callback(cached_ratings); return; }
        var apiKey = Lampa.Storage.get('mdblist_api_key'); if (!apiKey) { callback({ error: "MDBList API Key not configured in Additional Ratings settings" }); return; }
        var media_type = movieData.method === 'tv' ? 'show' : 'movie';
        var api_url = `${fetcher_config.api_url}${media_type}/${tmdb_id}?apikey=${apiKey}`;
        fetcher_network.clear(); fetcher_network.timeout(fetcher_config.request_timeout);
        fetcher_network.silent(api_url, function (response) {
            var r={error:null}; if(response&&response.ratings&&Array.isArray(response.ratings))response.ratings.forEach(t=>{if(t.source&&t.value!==null)r[t.source]=t.value}); else if(response&&response.error)r.error="MDBList API Error: "+response.error; else r.error="Invalid response format";
            if (r.error===null||(r.error&&!r.error.toLowerCase().includes("invalid api key")))setPersistedCache(tmdb_id,r); callback(r);
        }, function (xhr, status) { var e="MDBList request failed"; if(status)e+=` (Status: ${status})`; var r={error:e}; if(status!==401&&status!==403)setPersistedCache(tmdb_id,r); callback(r); });
    }
    console.log(`${PLUGIN_NAME}: Embedded MDBList_Fetcher logic defined.`);

    // =========================================================================
    // == Enhanced Interface Logic ==
    // =========================================================================
    console.log(`${PLUGIN_NAME}: Defining enhanced interface logic...`);

    // --- Interface Constants & State ---
    const STYLE_ID = 'enhanced_interface_style_merged_v1'; // Unique ID for merged style
    const imdbLogoUrl = 'https://psahx.github.io/ps_plug/IMDb_3_2_Logo_GOLD.png';
    const tmdbLogoUrl = 'https://psahx.github.io/ps_plug/TMDB.svg';
    const rtFreshLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes.svg';
    const rtRottenLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes_rotten.svg';
    // In-memory cache/pending state for the current view session
    let plugin_mdblist_results_cache = {};
    let plugin_mdblist_pending = {};

    // --- CSS Injection Function ---
    function injectCSS() {
        console.log(`${PLUGIN_NAME}: Attempt CSS inject (Style ID: ${STYLE_ID})...`);
        try {
            $('style[data-id^="patched_new_interface_style_step"]').remove(); // Clean previous test styles
            $('style[data-id="' + STYLE_ID + '"]').remove(); // Clean previous version of this style
            if ($('style[data-id="' + STYLE_ID + '"]').length) return; // Already injected
            // CSS content copied from the relevant <style> block of the "Modified Interface" code
            const css = `<style data-id="${STYLE_ID}">/* ... FULL CSS content as provided before ... */ .new-interface-info{height:22.5em;}.new-interface .full-start__rate{font-size:1.3em;margin-right:0em;display:inline-flex;align-items:center;vertical-align:middle;background-color:rgba(255,255,255,0.12);padding:0 0.2em 0 0;border-radius:0.3em;gap:0.5em;overflow:hidden;height:auto;}.new-interface .full-start__rate>div{font-weight:normal;font-size:1em;justify-content:center;background-color:rgba(0,0,0,0.4);color:#fff;padding:0.1em 0.3em;border-radius:0.3em;line-height:1.3;order:1;display:flex;align-items:center;flex-shrink:0;}.rt-rating-item>div.rt-score{padding-left:1.2em;padding-right:1.2em;}.placeholder-value{color:rgba(255,255,255,0.6);}.rating-logo{height:1.1em;width:auto;max-width:75px;vertical-align:middle;order:2;line-height:0;flex-shrink:0;}.tmdb-logo{height:.9em;}.rt-logo{height:1.1em;}.new-interface .card--small.card--wide{width:18.3em;}.new-interface-info{position:relative;padding:1.5em;}.new-interface-info__body{width:80%;padding-top:1.1em;}.new-interface-info__head{color:rgba(255,255,255,0.6);margin-bottom:1em;font-size:1.3em;min-height:1em;}.new-interface-info__head span{color:#fff;}.new-interface-info__title{font-size:4em;font-weight:600;margin-bottom:.3em;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical;margin-left:-0.03em;line-height:1.3;}.new-interface-info__details{margin-bottom:1.6em;display:flex;align-items:center;flex-wrap:wrap;min-height:1.9em;font-size:1.1em;gap:.5em 0;}.new-interface-info__split{margin:0 1em;font-size:.7em;display:inline-block;vertical-align:middle;}.new-interface-info__description{font-size:1.2em;font-weight:300;line-height:1.5;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:4;line-clamp:4;-webkit-box-orient:vertical;width:70%;}.new-interface .card-more__box{padding-bottom:95%;}.new-interface .full-start__background{height:108%;top:-6em;}.new-interface .card__promo{display:none;}.new-interface .card.card--wide+.card-more .card-more__box{padding-bottom:95%;}.new-interface .card.card--wide .card-watched{display:none!important;}body.light--version .new-interface-info__body{width:69%;padding-top:1.5em;}body.light--version .new-interface-info{height:25.3em;}body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view{animation:animation-card-focus .2s} body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view{animation:animation-trigger-enter .2s forwards}</style>`;
            Lampa.Template.add(STYLE_ID, css); $('body').append(Lampa.Template.get(STYLE_ID, {}, !0));
            console.log(`${PLUGIN_NAME}: CSS Injected successfully.`);
        } catch (e) { console.error(`${PLUGIN_NAME}: CSS injection error`, e); }
    }

    // --- Info Panel Constructor (`create` function from Modified Interface) ---
    // This defines the behavior of the info panel part of the component
    function EnhancedInfoPanel() { // Renamed from 'create' for clarity
      var html; var timer; var network = new Lampa.Reguest(); var loaded = {};
      // Make properties accessible on instance
      this.html = null; this.timer = timer; this.network = network; this.loaded = loaded;

      this.create = function () {
        html = $("<div class=\"new-interface-info\"><div class=\"new-interface-info__body\"><div class=\"new-interface-info__head\"></div><div class=\"new-interface-info__title\"></div><div class=\"new-interface-info__details\"></div><div class=\"new-interface-info__description\"></div></div></div>");
        this.html = html; // Assign to instance property
      };

      // Update method integrates fetchRatings call
      this.update = function (data) {
        var _thisInfo = this;
        try {
            _thisInfo.html.find('.new-interface-info__head,.new-interface-info__details').text('---');
            _thisInfo.html.find('.new-interface-info__title').text(data.title);
            _thisInfo.html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));
            Lampa.Background.change(Lampa.Api.img(data.backdrop_path, 'w200'));
            delete plugin_mdblist_results_cache[data.id]; delete plugin_mdblist_pending[data.id];
            if (data.id && data.method) {
                 plugin_mdblist_pending[data.id] = true; const fetchData = { id: data.id, method: data.method };
                 fetchRatings(fetchData, function(mdblistResult) { // Direct call to embedded function
                     plugin_mdblist_results_cache[data.id] = mdblistResult; delete plugin_mdblist_pending[data.id];
                     var tmdb_url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));
                     if (_thisInfo && _thisInfo.loaded && _thisInfo.loaded[tmdb_url] && typeof _thisInfo.draw === 'function') _thisInfo.draw(_thisInfo.loaded[tmdb_url]);
                 });
             }
            if (typeof _thisInfo.load === 'function') _thisInfo.load(data);
        } catch (e) { console.error(`${PLUGIN_NAME}: Error in info update`, e); }
      };

      // Draw method uses plugin's in-memory cache and new rating structure
      this.draw = function (data) {
         var _thisInfo = this;
         try {
            var createYear = ((data.release_date || data.first_air_date || '0000') + '').slice(0, 4);
            var vote = parseFloat((data.vote_average || 0) + '').toFixed(1);
            var head = [], details = [], countries = Lampa.Api.sources.tmdb.parseCountries(data), pg = Lampa.Api.sources.tmdb.parsePG(data);
            if (createYear !== '0000') head.push('<span>' + createYear + '</span>'); if (countries.length > 0) head.push(countries.join(', '));
            var mdblistResult = plugin_mdblist_results_cache[data.id];
            var imdbRating = '---', rtScoreDisplay = '--%', rtLogoUrl = '';
            if (mdblistResult) { if (mdblistResult.error === null) { if (mdblistResult.imdb !== undefined && mdblistResult.imdb !== null && typeof mdblistResult.imdb === 'number') imdbRating = parseFloat(mdblistResult.imdb).toFixed(1); if (mdblistResult.tomatoes !== undefined && mdblistResult.tomatoes !== null && typeof mdblistResult.tomatoes === 'number') { let score = mdblistResult.tomatoes; rtLogoUrl = score >= 60 ? rtFreshLogoUrl : (score >= 0 ? rtRottenLogoUrl : ''); rtScoreDisplay = score >= 0 ? score + '%' : 'N/A'; } } else { imdbRating = 'ERR'; }} else if (plugin_mdblist_pending[data.id]){ imdbRating = '...'; rtScoreDisplay = '...'; rtLogoUrl = rtFreshLogoUrl; }
            details.push('<div class="full-start__rate imdb-rating-item"><div>' + imdbRating + '</div><img src="' + imdbLogoUrl + '" class="rating-logo imdb-logo" alt="IMDB" draggable="false"></div>');
            details.push('<div class="full-start__rate tmdb-rating-item"><div>' + vote + '</div><img src="' + tmdbLogoUrl + '" class="rating-logo tmdb-logo" alt="TMDB" draggable="false"></div>');
            if (rtLogoUrl || (plugin_mdblist_pending[data.id] && rtScoreDisplay === '...')) { if(plugin_mdblist_pending[data.id] && rtScoreDisplay === '...') rtLogoUrl = rtFreshLogoUrl; details.push('<div class="full-start__rate rt-rating-item"><div class="rt-score">' + rtScoreDisplay + '</div>' + (rtLogoUrl ? '<img src="' + rtLogoUrl + '" class="rating-logo rt-logo" alt="RT Status" draggable="false">' : '') + '</div>'); }
            if (data.genres && data.genres.length > 0) details.push(data.genres.map(item => Lampa.Utils.capitalizeFirstLetter(item.name)).join(' | '));
            if (data.runtime) details.push(Lampa.Utils.secondsToTime(data.runtime * 60, true));
            if (pg) details.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + '</span>');
            _thisInfo.html.find('.new-interface-info__head').empty().append(head.join(', '));
            _thisInfo.html.find('.new-interface-info__details').empty().html(details.join('<span class="new-interface-info__split">&#9679;</span>'));
        } catch (e) { console.error(`${PLUGIN_NAME}: Error in info draw`, e); }
      };

      // Load method fetches TMDB details (mostly unchanged logic)
      this.load = function (data) {
         var _thisInfo = this;
         try { clearTimeout(_thisInfo.timer); var url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));
            if (_thisInfo.loaded && _thisInfo.loaded[url]) { if (!_thisInfo.loaded[url].method) _thisInfo.loaded[url].method = data.name ? 'tv' : 'movie'; return _thisInfo.draw(_thisInfo.loaded[url]); }
            if (!_thisInfo.network) _thisInfo.network = new Lampa.Reguest();
            _thisInfo.timer = setTimeout(function () { if (!_thisInfo.network || !_thisInfo.loaded || !_thisInfo.draw) return; _thisInfo.network.clear(); _thisInfo.network.timeout(5000);
                _thisInfo.network.silent(url, function (movie) { if (!_thisInfo.loaded || !_thisInfo.draw) return; _thisInfo.loaded[url] = movie; if (!movie.method) movie.method = data.name ? 'tv' : 'movie'; _thisInfo.draw(movie); });
            }, 300);
        } catch (e) { console.error(`${PLUGIN_NAME}: Error in info load`, e); }
      };

      this.render = function () { return this.html; }; // Use instance html
      this.empty = function () {}; // Standard empty

      // Destroy method clears in-memory cache
      this.destroy = function () {
           var _thisInfo = this;
           try { if(_thisInfo.html) _thisInfo.html.remove(); if(_thisInfo.network) _thisInfo.network.clear(); clearTimeout(_thisInfo.timer); _thisInfo.loaded = {}; _thisInfo.html = null; _thisInfo.network = null; _thisInfo.timer = null;
              // Clear plugin's in-memory cache/pending state
              plugin_mdblist_results_cache = {}; plugin_mdblist_pending = {};
          } catch (e) { console.error(`${PLUGIN_NAME}: Error in info destroy`, e); }
      };
    } // End EnhancedInfoPanel

    // --- Main Component Constructor (`component` function from Modified Interface) ---
    // This defines the main view logic
    function EnhancedComponent(object) { // Renamed from 'component'
        var network = new Lampa.Reguest(); var scroll = new Lampa.Scroll({ mask: true, over: true, scroll_by_item: true }); var items = []; var html = $('<div class="new-interface"><img class="full-start__background"></div>'); var active = 0; var newlampa = Lampa.Manifest.app_digital >= 166; var info; var lazydata; var viewall = Lampa.Storage.field('card_views_type') == 'view' || Lampa.Storage.field('navigation_type') == 'mouse'; var background_img = html.find('.full-start__background'); var background_last = ''; var background_timer;
        this.object = object; // Store constructor arg on instance

        // Assign methods directly to prototype or instance ('this') - using 'this' for consistency with provided code
        this.create = EnhancedInfoPanel; // Assign the constructor for the info panel

        // Instance variables needed by methods below (assigned in createOnInit simulation)
        this.network = network; this.scroll = scroll; this.items = items; this.html = html;
        this.active = active; this.newlampa = newlampa; this.lazydata = lazydata;
        this.viewall = viewall; this.background_img = background_img;
        this.background_last = background_last; this.background_timer = background_timer;
        this.info = null; // Initialized in build

        // Empty init function simulation (original create was empty)
        this.createOnInit = function() {};

        this.empty = function () { /* ... empty logic as provided before ... */
            var button; if (this.object.source == 'tmdb') { button = $('<div class="empty__footer"><div class="simple-button selector">' + Lampa.Lang.translate('change_source_on_cub') + '</div></div>'); button.find('.selector').on('hover:enter', function () { Lampa.Storage.set('source', 'cub'); Lampa.Activity.replace({ source: 'cub' }); }); } var empty = new Lampa.Empty(); this.html.append(empty.render(button)); this.start = empty.start; if(this.activity) { this.activity.loader(false); this.activity.toggle(); }
         };
        this.loadNext = function () { /* ... loadNext logic ... */
            var t=this; if(t.next&&!t.next_wait&&t.items.length){t.next_wait=!0;t.next(function(e){t.next_wait=!1;e.forEach(t.append.bind(t));if(t.items[t.active+1])Lampa.Layer.visible(t.items[t.active+1].render(!0))},function(){t.next_wait=!1})}
         };
        this.push = function () {};
        this.build = function (data) { /* ... build logic using EnhancedInfoPanel ... */
             var t=this; console.log(`${PLUGIN_NAME}: EnhancedComponent build() called.`); try{t.lazydata=data;if(typeof t.create=="function"){t.info=new t.create(t.object);t.info.create()}else{console.error(`${PLUGIN_NAME}: InfoPanel constructor missing.`);t.info=null} if(t.info)t.scroll.minus(t.info.render());data.slice(0,t.viewall?data.length:2).forEach(t.append.bind(t));if(t.info)t.html.append(t.info.render());t.html.append(t.scroll.render());if(t.newlampa){Lampa.Layer.update(t.html);Lampa.Layer.visible(t.scroll.render(!0));t.scroll.onEnd=t.loadNext.bind(t);t.scroll.onWheel=function(e){if(!Lampa.Controller.own(t))t.start();if(e>0)t.down();else if(t.active>0)t.up()}} if(t.items.length>0&&t.items[0]&&t.items[0].data&&t.info){t.active=0;if(!t.items[0].data.method)t.items[0].data.method=t.items[0].data.name?"tv":"movie";t.info.update(t.items[0].data);t.background(t.items[0].data)} if(t.activity&&typeof t.activity.loader=="function"){t.activity.loader(!1);t.activity.toggle()}else console.warn(`${PLUGIN_NAME}: activity missing in build finish.`)}catch(e){console.error(`${PLUGIN_NAME}: Error in build`,e)}
         };
        this.background = function (elem) { /* ... background logic with checks ... */
            var t=this; try{if(!elem||!elem.backdrop_path)return;var a=Lampa.Api.img(elem.backdrop_path,"w1280");clearTimeout(t.background_timer);if(a==t.background_last)return;if(!t.background_img||!t.background_img.length){t.background_img=t.html.find(".full-start__background");if(!t.background_img.length)return} t.background_timer=setTimeout(function(){if(!t.background_img||!t.background_img.length)return;t.background_img.removeClass("loaded");if(t.background_img[0]){t.background_img[0].onload=()=>{if(t.background_img)t.background_img.addClass("loaded")};t.background_img[0].onerror=()=>{if(t.background_img)t.background_img.removeClass("loaded")};t.background_last=a;setTimeout(()=>{if(t.background_img&&t.background_img[0])t.background_img[0].src=t.background_last},300)}}.bind(t),1e3)}catch(e){console.error(`${PLUGIN_NAME}: Error in background`,e)}
         };
        this.append = function (element) { /* ... append logic ensuring elem.method ... */
            var t=this; try{if(element.ready)return;element.ready=!0;var a=new Lampa.InteractionLine(element,{url:element.url,card_small:!0,cardClass:element.cardClass,genres:t.object.genres,object:t.object,card_wide:!0,nomore:element.nomore});a.create();a.onDown=t.down.bind(t);a.onUp=t.up.bind(t);a.onBack=t.back.bind(t);a.onToggle=function(){t.active=t.items.indexOf(a)};if(t.onMore)a.onMore=t.onMore.bind(t);a.onFocus=function(e){if(!e.method)e.method=e.name?"tv":"movie";if(t.info)t.info.update(e);t.background(e)};a.onHover=function(e){if(!e.method)e.method=e.name?"tv":"movie";if(t.info)t.info.update(e);t.background(e)};if(t.info&&typeof t.info.empty=="function")a.onFocusMore=t.info.empty.bind(t.info);t.scroll.append(a.render());t.items.push(a)}catch(e){console.error(`${PLUGIN_NAME}: Error in append`,e)}
         };
        this.back = function () { Lampa.Activity.backward(); };
        this.down = function () { /* ... down logic ... */
             this.active++; this.active = Math.min(this.active, this.items.length - 1); if (!this.viewall && this.lazydata) this.lazydata.slice(0, this.active + 2).forEach(this.append.bind(this)); if(this.items[this.active]) { this.items[this.active].toggle(); this.scroll.update(this.items[this.active].render()); }
         };
        this.up = function () { /* ... up logic ... */
             this.active--; if (this.active < 0) { this.active = 0; Lampa.Controller.toggle('head'); } else { if(this.items[this.active]){ this.items[this.active].toggle(); this.scroll.update(this.items[this.active].render()); } }
         };
        this.start = function () { /* ... start logic ... */
             var t=this; Lampa.Controller.add("content",{link:t,toggle:function(){if(t.activity&&t.activity.canRefresh())return!1;if(t.items.length&&t.items[t.active])t.items[t.active].toggle()},update:function(){},left:function(){if(Navigator.canmove("left"))Navigator.move("left");else Lampa.Controller.toggle("menu")},right:function(){Navigator.move("right")},up:function(){if(Navigator.canmove("up"))Navigator.move("up");else Lampa.Controller.toggle("head")},down:function(){if(Navigator.canmove("down"))Navigator.move("down")},back:t.back});Lampa.Controller.toggle("content")
         };
        this.refresh = function () { if(this.activity) { this.activity.loader(true); this.activity.need_refresh = true; } };
        this.pause = function () {}; this.stop = function () {};
        this.render = function () { return this.html; }; // Use instance html
        this.destroy = function () { /* ... destroy logic with added cleanup ... */
             var t=this; console.log(`${PLUGIN_NAME}: EnhancedComponent destroy() called.`); try{clearTimeout(t.background_timer);if(t.network)t.network.clear();if(Array.isArray(t.items))Lampa.Arrays.destroy(t.items);if(t.scroll)t.scroll.destroy();if(t.info)t.info.destroy();if(t.html)t.html.remove();t.items=null;t.network=null;t.lazydata=null;t.info=null;t.html=null;t.background_timer=null;t.scroll=null;t.background_img=null;t.object=null;t.activity=null}catch(e){console.error(`${PLUGIN_NAME}: Error in component destroy`,e)}
         };

         // Simulate calling createOnInit if necessary (original didn't explicitly call it)
         this.createOnInit();

    } // End EnhancedComponent

    // --- Factory Replacement Logic ---
    let originalInteractionMainFactory = null; // Stores Lampa's default factory

    // This is the factory function that will BE Lampa.InteractionMain
    function ourReplacementFactory(object) {
        console.log(`${PLUGIN_NAME}: Factory called for source:`, object?.source);
        let useOurComponent = false;
        try {
            // Condition check from user's Modified script wrapper
            useOurComponent = (object.source == 'tmdb' || object.source == 'cub') &&
                              (window.innerWidth >= 767) &&
                              Lampa.Account.hasPremium() &&
                              (Lampa.Manifest.app_digital >= 153);
             console.log(`${PLUGIN_NAME}: Factory conditions check result: ${useOurComponent}`);
        } catch (e) { console.error(`${PLUGIN_NAME}: Error checking conditions`, e); }

        if (useOurComponent) {
             console.log(`${PLUGIN_NAME}: Conditions Met. Returning Enhanced Component.`);
             try { return new EnhancedComponent(object); } // Use our component
             catch (e) { console.error(`${PLUGIN_NAME}: Error creating EnhancedComponent!`, e); /* Fall through to fallback */ }
        }

        // Fallback to original/default if conditions not met or error occurred
        console.log(`${PLUGIN_NAME}: Conditions NOT Met or error occurred. Returning original/default component.`);
        if (originalInteractionMainFactory) {
            try { return new originalInteractionMainFactory(object); } // Use captured original
            catch (e) { console.error(`${PLUGIN_NAME}: Error creating original/default component!`, e); }
        } else { console.error(`${PLUGIN_NAME}: Original factory not captured, cannot return fallback!`); }
        return null; // Ultimate fallback
    }

    // Core initialization function (captures original, replaces with ourReplacementFactory)
    function initPlugin() {
        // Use flag to ensure it runs only once
        if (window.mergedInterfacePluginInitialized) return;
        console.log(`${PLUGIN_NAME}: initPlugin() called. Replacing Lampa.InteractionMain...`);
        try {
            if (typeof Lampa.InteractionMain === 'function') {
                originalInteractionMainFactory = Lampa.InteractionMain; // Capture default factory
                Lampa.InteractionMain = ourReplacementFactory; // Replace with our factory
                window.mergedInterfacePluginInitialized = true; // Set global flag
                console.log(`%c${PLUGIN_NAME}: Lampa.InteractionMain replaced successfully.`, 'color: green; font-weight: bold;');
            } else {
                console.error(`${PLUGIN_NAME}: Lampa.InteractionMain is not a function at init time! Cannot replace.`);
            }
        } catch (e) {
             console.error(`${PLUGIN_NAME}: CRITICAL Error during initPlugin execution:`, e);
        }
    }

    // --- Plugin Start ---
    console.log(`${PLUGIN_NAME}: Script loaded.`);
    // Initialize on app ready - no polling needed for this replacement strategy
    Lampa.Listener.follow('app', (e) => {
        if (e.type == 'ready') {
            console.log(`${PLUGIN_NAME}: App ready event received.`);
            // Register settings first (includes guards against duplicates)
            registerFetcherSettings();
            // Inject CSS
            injectCSS();
            // Replace the factory
            initPlugin();
            console.log(`${PLUGIN_NAME}: Initialization sequence complete.`);
        }
    });

})(); // Standard IIFE end
