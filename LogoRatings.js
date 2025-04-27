// == Main Module | Matched Lampa Source Text/Placement Attributes ONLY ==
(function () {
    'use strict';

    // --- MDBList Fetcher State ---
    var mdblistRatingsCache = {};
    var mdblistRatingsPending = {};
    // -----------------------------

    // --- create function (Info Panel Handler) ---
    // UNCHANGED create function...
    function create() { var html; var timer; var network = new Lampa.Reguest(); var loaded = {}; this.create = function () { html = $("<div class=\"new-interface-info\">\n            <div class=\"new-interface-info__body\">\n                <div class=\"new-interface-info__head\"></div>\n                <div class=\"new-interface-info__title\"></div>\n                <div class=\"new-interface-info__details\"></div>\n                <div class=\"new-interface-info__description\"></div>\n            </div>\n        </div>"); }; this.update = function (data) { var _this = this; html.find('.new-interface-info__head,.new-interface-info__details').text('---'); html.find('.new-interface-info__title').text(data.title); html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext')); Lampa.Background.change(Lampa.Api.img(data.backdrop_path, 'w200')); delete mdblistRatingsCache[data.id]; delete mdblistRatingsPending[data.id]; if (window.MDBLIST_Fetcher && typeof window.MDBLIST_Fetcher.fetch === 'function' && data.id && data.method) { mdblistRatingsPending[data.id] = true; window.MDBLIST_Fetcher.fetch(data, function(mdblistResult) { mdblistRatingsCache[data.id] = mdblistResult; delete mdblistRatingsPending[data.id]; var tmdb_url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language')); if (loaded[tmdb_url]) { _this.draw(loaded[tmdb_url]); } }); } else if (!data.method) { /* Optional warning */ } this.load(data); };
      this.draw = function (data) { /* UNCHANGED draw function (Number+Logo Order) */ var create = ((data.release_date || data.first_air_date || '0000') + '').slice(0, 4); var vote = parseFloat((data.vote_average || 0) + '').toFixed(1); var head = []; var details = []; var countries = Lampa.Api.sources.tmdb.parseCountries(data); var pg = Lampa.Api.sources.tmdb.parsePG(data); const imdbLogoUrl = 'https://psahx.github.io/ps_plug/IMDb_IOS-OSX_App_Icon.png'; const tmdbLogoUrl = 'https://psahx.github.io/ps_plug/TMDB.svg'; const rtFreshLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes.svg'; const rtRottenLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes_rotten.svg'; if (create !== '0000') head.push('<span>' + create + '</span>'); if (countries.length > 0) head.push(countries.join(', ')); var mdblistResult = mdblistRatingsCache[data.id]; var imdbRating = mdblistResult && mdblistResult.imdb !== null && typeof mdblistResult.imdb === 'number' ? parseFloat(mdblistResult.imdb || 0).toFixed(1) : '0.0'; details.push('<div class="full-start__rate imdb-rating-item">' + '<div>' + imdbRating + '</div>' + '<img src="' + imdbLogoUrl + '" class="rating-logo imdb-logo" alt="IMDB" draggable="false">' + '</div>'); details.push('<div class="full-start__rate tmdb-rating-item">' + '<div>' + vote + '</div>' + '<img src="' + tmdbLogoUrl + '" class="rating-logo tmdb-logo" alt="TMDB" draggable="false">' + '</div>'); if (mdblistResult && typeof mdblistResult.tomatoes === 'number' && mdblistResult.tomatoes !== null) { let score = mdblistResult.tomatoes; let logoUrl = ''; if (score >= 60) { logoUrl = rtFreshLogoUrl; } else if (score >= 0) { logoUrl = rtRottenLogoUrl; } if (logoUrl) { details.push('<div class="full-start__rate rt-rating-item">' + '<div class="rt-score">' + score + '%</div>' + '<img src="' + logoUrl + '" class="rating-logo rt-logo" alt="RT Status" draggable="false">' + '</div>'); } } if (data.genres && data.genres.length > 0) details.push(data.genres.map(function (item) { return Lampa.Utils.capitalizeFirstLetter(item.name); }).join(' | ')); if (data.runtime) details.push(Lampa.Utils.secondsToTime(data.runtime * 60, true)); if (pg) details.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + '</span>'); html.find('.new-interface-info__head').empty().append(head.join(', ')); html.find('.new-interface-info__details').html(details.join('<span class="new-interface-info__split">&#9679;</span>')); };
      this.load = function (data) { /* UNCHANGED load function */ var _this = this; clearTimeout(timer); var url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language')); if (loaded[url]) return this.draw(loaded[url]); timer = setTimeout(function () { network.clear(); network.timeout(5000); network.silent(url, function (movie) { loaded[url] = movie; if (!movie.method) movie.method = data.name ? 'tv' : 'movie'; _this.draw(movie); }); }, 300); };
      this.render = function () { return html; }; this.empty = function () {};
      this.destroy = function () { /* UNCHANGED destroy function */ html.remove(); loaded = {}; html = null; mdblistRatingsCache = {}; mdblistRatingsPending = {}; };
    }


    // --- component function (Main List Handler) ---
    // ORIGINAL FUNCTION - UNCHANGED
    function component(object) { var network = new Lampa.Reguest(); var scroll = new Lampa.Scroll({ mask: true, over: true, scroll_by_item: true }); var items = []; var html = $('<div class="new-interface"><img class="full-start__background"></div>'); var active = 0; var newlampa = Lampa.Manifest.app_digital >= 166; var info; var lezydata; var viewall = Lampa.Storage.field('card_views_type') == 'view' || Lampa.Storage.field('navigation_type') == 'mouse'; var background_img = html.find('.full-start__background'); var background_last = ''; var background_timer; this.create = function () {}; this.empty = function () { /* Original empty code */ var button; if (object.source == 'tmdb') { button = $('<div class="empty__footer"><div class="simple-button selector">' + Lampa.Lang.translate('change_source_on_cub') + '</div></div>'); button.find('.selector').on('hover:enter', function () { Lampa.Storage.set('source', 'cub'); Lampa.Activity.replace({ source: 'cub' }); }); } var empty = new Lampa.Empty(); html.append(empty.render(button)); this.start = empty.start; this.activity.loader(false); this.activity.toggle(); }; this.loadNext = function () { /* Original loadNext code */ var _this = this; if (this.next && !this.next_wait && items.length) { this.next_wait = true; this.next(function (new_data) { _this.next_wait = false; new_data.forEach(_this.append.bind(_this)); Lampa.Layer.visible(items[active + 1].render(true)); }, function () { _this.next_wait = false; }); } }; this.push = function () {}; this.build = function (data) { /* Original build code */ var _this2 = this; lezydata = data; info = new create(object); info.create(); scroll.minus(info.render()); data.slice(0, viewall ? data.length : 2).forEach(this.append.bind(this)); html.append(info.render()); html.append(scroll.render()); if (newlampa) { /* Original newlampa code */ Lampa.Layer.update(html); Lampa.Layer.visible(scroll.render(true)); scroll.onEnd = this.loadNext.bind(this); scroll.onWheel = function (step) { if (!Lampa.Controller.own(_this2)) _this2.start(); if (step > 0) _this2.down(); else if (active > 0) _this2.up(); }; } if (items.length > 0 && items[0] && items[0].data) { active = 0; info.update(items[active].data); this.background(items[active].data); } this.activity.loader(false); this.activity.toggle(); }; this.background = function (elem) { /* Original background code */ if (!elem || !elem.backdrop_path) return; var new_background = Lampa.Api.img(elem.backdrop_path, 'w1280'); clearTimeout(background_timer); if (new_background == background_last) return; background_timer = setTimeout(function () { background_img.removeClass('loaded'); background_img[0].onload = function () { background_img.addClass('loaded'); }; background_img[0].onerror = function () { background_img.removeClass('loaded'); }; background_last = new_background; setTimeout(function () { if (background_img[0]) background_img[0].src = background_last; }, 300); }, 1000); }; this.append = function (element) { /* Original append code */ if (element.ready) return; var _this3 = this; element.ready = true; var item = new Lampa.InteractionLine(element, { url: element.url, card_small: true, cardClass: element.cardClass, genres: object.genres, object: object, card_wide: true, nomore: element.nomore }); item.create(); item.onDown = this.down.bind(this); item.onUp = this.up.bind(this); item.onBack = this.back.bind(this); item.onToggle = function () { active = items.indexOf(item); }; if (this.onMore) item.onMore = this.onMore.bind(this); item.onFocus = function (elem) { if (!elem.method) elem.method = elem.name ? 'tv' : 'movie'; info.update(elem); _this3.background(elem); }; item.onHover = function (elem) { if (!elem.method) elem.method = elem.name ? 'tv' : 'movie'; info.update(elem); _this3.background(elem); }; item.onFocusMore = info.empty.bind(info); scroll.append(item.render()); items.push(item); }; this.back = function () { Lampa.Activity.backward(); }; this.down = function () { active++; active = Math.min(active, items.length - 1); if (!viewall && lezydata) lezydata.slice(0, active + 2).forEach(this.append.bind(this)); items[active].toggle(); scroll.update(items[active].render()); }; this.up = function () { active--; if (active < 0) { active = 0; Lampa.Controller.toggle('head'); } else { items[active].toggle(); scroll.update(items[active].render()); } }; this.start = function () { /* Original start code */ var _this4 = this; Lampa.Controller.add('content', { link: this, toggle: function toggle() { if (_this4.activity.canRefresh()) return false; if (items.length) { items[active].toggle(); } }, update: function update() {}, left: function left() { if (Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); }, right: function right() { Navigator.move('right'); }, up: function up() { if (Navigator.canmove('up')) Navigator.move('up'); else Lampa.Controller.toggle('head'); }, down: function down() { if (Navigator.canmove('down')) Navigator.move('down'); }, back: this.back }); Lampa.Controller.toggle('content'); }; this.refresh = function () { this.activity.loader(true); this.activity.need_refresh = true; }; this.pause = function () {}; this.stop = function () {}; this.render = function () { return html; }; this.destroy = function () { /* Original destroy code */ clearTimeout(background_timer); network.clear(); Lampa.Arrays.destroy(items); scroll.destroy(); if (info) info.destroy(); if (html) html.remove(); items = null; network = null; lezydata = null; info = null; html = null; }; }


    // --- Plugin Initialization Logic ---
    function startPlugin() {
        // UNCHANGED Initialization setup...
        if (!window.Lampa || !Lampa.Utils || !Lampa.Lang || !Lampa.Storage || !Lampa.TMDB || !Lampa.Template || !Lampa.Reguest || !Lampa.Api || !Lampa.InteractionLine || !Lampa.Scroll || !Lampa.Activity || !Lampa.Controller) { console.error("NewInterface Match Text Final: Missing Lampa components"); return; }
        Lampa.Lang.add({ full_notext: { en: 'No description', ru: 'Нет описания'}, });
        window.plugin_interface_ready = true; var old_interface = Lampa.InteractionMain; var new_interface = component;
        Lampa.InteractionMain = function (object) { var use = new_interface; if (!(object.source == 'tmdb' || object.source == 'cub')) use = old_interface; if (window.innerWidth < 767) use = old_interface; if (!Lampa.Account.hasPremium()) use = old_interface; if (Lampa.Manifest.app_digital < 153) use = old_interface; return new use(object); };

        // **MODIFIED CSS**: Changed ONLY font-size and margin-right
        var style_id = 'new_interface_style_final_text_placement'; // Final style ID
        if (!$('style[data-id="' + style_id + '"]').length) {
             $('style[data-id^="new_interface_style_"]').remove(); // Clean up previous

            Lampa.Template.add(style_id, `
            <style data-id="${style_id}">
            /* Base styles... (kept from previous working state) */
            .new-interface .card--small.card--wide { width: 18.3em; }
            .new-interface-info { position: relative; padding: 1.5em; height: 24em; }
            .new-interface-info__body { width: 80%; padding-top: 1.1em; }
            .new-interface-info__head { color: rgba(255, 255, 255, 0.6); margin-bottom: 1em; font-size: 1.3em; min-height: 1em; }
            .new-interface-info__head span { color: #fff; }
            .new-interface-info__title { font-size: 4em; font-weight: 600; margin-bottom: 0.3em; overflow: hidden; text-overflow: "."; display: -webkit-box; -webkit-line-clamp: 1; line-clamp: 1; -webkit-box-orient: vertical; margin-left: -0.03em; line-height: 1.3; }
            .new-interface-info__details { margin-bottom: 1.6em; display: flex; align-items: center; flex-wrap: wrap; min-height: 1.9em; font-size: 1.1em; }
            .new-interface-info__split { margin: 0 1em; font-size: 0.7em; }
            .new-interface-info__description { font-size: 1.2em; font-weight: 300; line-height: 1.5; overflow: hidden; text-overflow: "."; display: -webkit-box; -webkit-line-clamp: 4; line-clamp: 4; -webkit-box-orient: vertical; width: 70%; }
            .new-interface .card-more__box { padding-bottom: 95%; }
            .new-interface .full-start__background { height: 108%; top: -6em; }
            .new-interface .card__promo { display: none; }
            .new-interface .card.card--wide+.card-more .card-more__box { padding-bottom: 95%; }
            .new-interface .card.card--wide .card-watched { display: none !important; }
            body.light--version .new-interface-info__body { width: 69%; padding-top: 1.5em; }
            body.light--version .new-interface-info { height: 25.3em; }
            body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view { animation: animation-card-focus 0.2s; }
            body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view { animation: animation-trigger-enter 0.2s forwards; }

            /* --- Rating Box Styles --- */
            .new-interface .full-start__rate {
                font-size: 1.45em;        /* ** MODIFIED: Lampa Source base size ** */
                margin-right: 1em;         /* ** MODIFIED: Lampa Source spacing ** */
                display: inline-flex;
                align-items: center;
                vertical-align: middle;
                background: rgba(0, 0, 0, 0.15); /* Lampa Source background */
                padding: 0 0.4em;              /* Keep padding based on Lampa source analysis */
                border-radius: 0.3em;          /* Lampa Source smoothness */
                gap: 0.5em;                    /* Keep gap */
                overflow: hidden;
                height: auto;
            }
            /* Style for the Number Div */
            .new-interface .full-start__rate > div {
                font-weight: 600;
                background: rgba(0, 0, 0, 0.15); /* Lampa Source background */
                color: #ffffff;
                padding: 0.15em 0.4em;
                border-radius: 0.3em;    /* Lampa Source smoothness */
                line-height: 1.2;
                font-size: 0.9em;         /* ** MODIFIED: Smaller relative size ** */
                order: 1;
                display: flex;
                align-items: center;
                justify-content: center; /* Added from source */
                flex-shrink: 0;
            }
             /* Specific padding for RT score */
             .rt-rating-item > div.rt-score {
                 padding-left: 0.6em; /* Keep wider padding */
                 padding-right: 0.6em;
             }
            /* General Logo Style - UNCHANGED from previous base */
            .rating-logo {
                height: 1.1em;
                width: auto;
                max-width: 35px;
                vertical-align: middle;
                order: 2;
                line-height: 0;
            }
             /* Specific Logo Adjustments - UNCHANGED from previous base */
            .tmdb-logo { height: 0.9em; }
            .rt-logo { height: 1.1em; }
            /* --- End Rating Box Styles --- */

            </style>
            `);
          $('body').append(Lampa.Template.get(style_id, {}, true));
        }
    }

    // Original check before starting
    if (!window.plugin_interface_ready) startPlugin();

})();
