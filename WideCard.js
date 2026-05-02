// == Lampa Homepage MDBList Phase 4 (The Grand Fusion) ==
(function () {
    'use strict';

    // --- 1. Global CSS Injection for Grid Rating Badges ---
    if (!$('style[data-id="mdblist_homepage_cards"]').length) {
        $('head').append(`
        <style data-id="mdblist_homepage_cards">
            /* Hide Lampa's native rating badge */
            .card--wide .card__vote { display: none !important; }
            
            /* TWEAK 1: Push text/logo up to prevent overlap with ratings */
            .card--wide .card__promo { padding-bottom: 2.2em !important; }
            
            /* Container for our custom array */
            .mdblist-ratings-wrapper { 
                position: absolute; 
                bottom: 0.5em; 
                left: 0.5em; 
                display: flex; 
                flex-direction: row; 
                flex-wrap: wrap;     
                gap: 0.15em; /* TWEAK 1: Ratings closer together */
                z-index: 10; 
                align-items: center; 
            }
            
            /* TWEAK 1: Squeezed paddings to fit more on one line */
            .mdblist-ratings-wrapper .full-start__rate { font-size: 1.1em; display: inline-flex; align-items: center; vertical-align: middle; background-color: rgba(255, 255, 255, 0.12); padding: 0 0.1em 0 0; border-radius: 0.3em; gap: 0.2em; overflow: hidden; height: auto; }
            .mdblist-ratings-wrapper .full-start__rate > div { font-weight: normal; font-size: 0.9em; justify-content: center; background-color: rgba(0, 0, 0, 0.4); color: #ffffff; padding: 0em 0.2em; border-radius: 0.3em; line-height: 1; order: 1; display: flex; align-items: center; flex-shrink: 0; }
            .mdblist-ratings-wrapper .rating-logo { height: 1.1em; width: auto; max-width: 75px; vertical-align: middle; order: 2; line-height: 0; }
            .mdblist-ratings-wrapper .tmdb-logo { height: 0.9em; }
            .mdblist-ratings-wrapper .rt-logo { height: 1.1em; }
        </style>
        `);
    }

    // --- 2. Master Script Variables ---
    var config = { api_url: 'https://api.mdblist.com/tmdb/', cache_time: 60 * 60 * 12 * 1000, cache_key: 'mdblist_ratings_cache', cache_limit: 500, request_timeout: 10000 };
    var mdblistRatingsCache = {}; // Restored for Info Panel
    var mdblistRatingsPending = {}; // Restored for Info Panel

    const imdbLogoUrl = 'https://psahx.github.io/ps_plug/IMDb_3_2_Logo_GOLD.png';
    const tmdbLogoUrl = 'https://psahx.github.io/ps_plug/TMDB.svg';
    const rtFreshLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes.svg';
    const rtRottenLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes_rotten.svg';
    const rtAudienceFreshLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes_positive_audience.svg';
    const rtAudienceSpilledLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes_negative_audience.svg';
    const metacriticLogoUrl = 'https://psahx.github.io/ps_plug/Metacritic_M.png';
    const traktLogoUrl = 'https://psahx.github.io/ps_plug/Trakt.svg';
    const letterboxdLogoUrl = 'https://psahx.github.io/ps_plug/letterboxd-decal-dots-pos-rgb.svg';
    const rogerEbertLogoUrl = 'https://psahx.github.io/ps_plug/Roger_Ebert.jpeg';

    // --- 3. Language Strings ---
    if (window.Lampa && Lampa.Lang) {
        Lampa.Lang.add({
            mdblist_api_key_desc: { ru: "Введите ваш API ключ с сайта MDBList.com", en: "Enter your API key from MDBList.com", uk: "Введіть ваш API ключ з сайту MDBList.com" },
            additional_ratings_title: { ru: "Дополнительные Рейтинги", en: "Additional Ratings", uk: "Додаткові Рейтинги" },
            select_ratings_button_name: { en: "Select Rating Providers", ru: "Выбрать Источники Рейтингов", uk: "Обрати Джерела Рейтингів" },
            select_ratings_button_desc: { en: "Choose which ratings to display", ru: "Выберите, какие рейтинги отображать", uk: "Оберіть, які рейтинги відображати" },
            select_ratings_dialog_title: { en: "Select Ratings", ru: "Выбор Рейтингов", uk: "Вибір Рейтингів" },
            logo_toggle_name: { ru: "Логотип вместо заголовка", en: "Logo Instead of Title", uk: "Логотип замість заголовка" },
            logo_toggle_desc: { ru: "Заменяет текстовый заголовок фильма логотипом", en: "Replaces movie text title with a logo", uk: "Замінює текстовий заголовок логотипом" },
            settings_show: { ru: "Показать", en: "Show", uk: "Показати" },
            settings_hide: { ru: "Скрыть", en: "Hide", uk: "Приховати" },
            info_panel_logo_height_name: { ru: "Размер логотипа", en: "Logo Size", uk: "Висота логотипу" },
            info_panel_logo_height_desc: { ru: "Максимальная высота логотипа", en: "Maximum logo height", uk: "Максимальна высота логотипу" },
            full_notext: { en: 'No description', ru: 'Нет описания', uk: 'Немає опису' }
        });
    }

    // --- 4. Settings UI Registration ---
    if (window.Lampa && Lampa.SettingsApi) {
        Lampa.SettingsApi.addComponent({
            component: 'additional_ratings',
            name: Lampa.Lang.translate('additional_ratings_title'),
            icon: '<svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>'
        });
        Lampa.SettingsApi.addParam({ component: 'additional_ratings', param: { name: 'mdblist_api_key', type: 'input', 'default': '', placeholder: 'Enter your MDBList API Key' }, field: { name: 'MDBList API Key', description: Lampa.Lang.translate('mdblist_api_key_desc') }, onChange: function() { Lampa.Settings.update(); } });
        Lampa.SettingsApi.addParam({ component: 'additional_ratings', param: { name: 'select_ratings_button', type: 'button' }, field: { name: Lampa.Lang.translate('select_ratings_button_name'), description: Lampa.Lang.translate('select_ratings_button_desc') }, onChange: function () { showRatingProviderSelection(); } });
        Lampa.SettingsApi.addParam({ component: 'additional_ratings', param: { name: 'show_logo_instead_of_title', type: 'select', values: { 'true': Lampa.Lang.translate('settings_show'), 'false': Lampa.Lang.translate('settings_hide') }, 'default': 'false' }, field: { name: Lampa.Lang.translate('logo_toggle_name'), description: Lampa.Lang.translate('logo_toggle_desc') }, 
            onChange: function(value) { 
                Lampa.Storage.set('show_logo_instead_of_title', value); 
                // TWEAK 2: Instant redraw for Logo toggle
                $('.card__promo-title').empty(); 
                $('.card').each(function() { this.mdblist_fetched = false; }); 
            } 
        });
        Lampa.SettingsApi.addParam({ component: 'additional_ratings', param: { name: 'info_panel_logo_max_height', type: 'select', values: { '50': '50px', '75': '75px', '100': '100px', '125': '125px', '150': '150px', '175': '175px', '200': '200px', '225': '225px', '250': '250px', '300': '300px', '350': '350px', '400': '400px', '450': '450px', '500': '500px' }, 'default': '100' }, field: { name: Lampa.Lang.translate('info_panel_logo_height_name'), description: Lampa.Lang.translate('info_panel_logo_height_desc') }, onChange: function(value) { Lampa.Storage.set('info_panel_logo_max_height', value); } });
    }

    // --- 5. Rating Selection Dialog ---
    function showRatingProviderSelection() {
        const providers = [
            { title: 'IMDb', id: 'show_rating_imdb', default: true },
            { title: 'TMDB', id: 'show_rating_tmdb', default: true },
            { title: 'Rotten Tomatoes (Critics)', id: 'show_rating_tomatoes', default: false },
            { title: 'Rotten Tomatoes (Audience)', id: 'show_rating_audience', default: false },
            { title: 'Metacritic', id: 'show_rating_metacritic', default: false },
            { title: 'Trakt', id: 'show_rating_trakt', default: false },
            { title: 'Letterboxd', id: 'show_rating_letterboxd', default: false },
            { title: 'Roger Ebert', id: 'show_rating_rogerebert', default: false }
        ];

        let selectItems = providers.map(provider => { return { title: provider.title, id: provider.id, checkbox: true, checked: (Lampa.Storage.get(provider.id, provider.default) === true || Lampa.Storage.get(provider.id, provider.default) === 'true'), default: provider.default }; });
        var currentController = Lampa.Controller.enabled().name;
        Lampa.Select.show({
            title: Lampa.Lang.translate('select_ratings_dialog_title'), items: selectItems,                                        
            onBack: function () { Lampa.Controller.toggle(currentController || 'settings'); },
            onCheck: function (item) { 
                let newState = !(Lampa.Storage.get(item.id, item.default) === true || Lampa.Storage.get(item.id, item.default) === 'true');
                Lampa.Storage.set(item.id, newState);
                item.checked = newState;
                
                // TWEAK 2: Instant Apply Wipe
                $('.mdblist-ratings-wrapper').remove();
                $('.card').each(function() { this.mdblist_fetched = false; });
            }
        });
    }

    // --- 6. Caching & Fetching Functions ---
    function getCache(tmdb_id) {
        if (!window.Lampa || !Lampa.Storage) return false;
        var cache = Lampa.Storage.cache(config.cache_key, config.cache_limit, {}); 
        if (cache[tmdb_id]) {
            if ((new Date().getTime() - cache[tmdb_id].timestamp) > config.cache_time) { delete cache[tmdb_id]; Lampa.Storage.set(config.cache_key, cache); return false; } 
          return cache[tmdb_id].data; 
        }
        return false;
    }

    function setCache(tmdb_id, data) {
        if (!window.Lampa || !Lampa.Storage) return;
        var cache = Lampa.Storage.cache(config.cache_key, config.cache_limit, {});
        cache[tmdb_id] = { timestamp: new Date().getTime(), data: data };
        Lampa.Storage.set(config.cache_key, cache); 
    }

    function fetchRatings(movieData, callback) {
        var net = (window.Lampa && Lampa.Reguest) ? new Lampa.Reguest() : null;
        if (!net || !movieData || !movieData.id || !callback) return;
        var cached_ratings = getCache(movieData.id);
        if (cached_ratings) return callback(cached_ratings);
        var apiKey = Lampa.Storage.get('mdblist_api_key');
        if (!apiKey) return callback({ error: "No API Key" });

        var api_url = "".concat(config.api_url).concat(movieData.method === 'tv' ? 'show' : 'movie', "/").concat(movieData.id, "?apikey=").concat(apiKey);
        net.timeout(config.request_timeout);
        net.silent(api_url, function (response) {
            var ratingsResult = { error: null }; 
            if (response && response.ratings && Array.isArray(response.ratings)) { response.ratings.forEach(function(rating) { if (rating.source && rating.value !== null) ratingsResult[rating.source] = rating.value; }); } 
            else if (response && response.error) { ratingsResult.error = response.error; }
            if (!ratingsResult.error || !ratingsResult.error.toLowerCase().includes("invalid api key")) setCache(movieData.id, ratingsResult);
            callback(ratingsResult);
        }, function () { callback({ error: "Network Failed" }); }); 
    }

    // --- 7. The V14 Watcher & Visual Injector (For Wide Grid Cards) ---
    function applyWideDOM() {
        setInterval(function() {
            var activity = window.Lampa && Lampa.Activity ? Lampa.Activity.active() : null;
            if (activity && (activity.component === 'main' || activity.component === 'category')) {
                
                $('.card:not(.card--wide):visible').each(function() {
                    var card = $(this);
                    var movie = this.card_data; 
                    if (!movie || !movie.id) return; 

                    card.addClass('card--wide');
                    var imgElement = card.find('.card__img');
                    var targetImage = movie.backdrop_path ? movie.backdrop_path : movie.poster_path;
                    if (targetImage) {
                        imgElement.attr('src', Lampa.Api.img(targetImage, 'w780'));
                        imgElement.css({ 'object-fit': 'cover', 'object-position': 'top' });
                    }
                    
                    var titleText = movie.title || movie.name || card.find('.card__title').text() || "Unknown";
                    var synopsis = movie.overview || "";
                    if (synopsis.length > 115) synopsis = synopsis.substring(0, 115) + '...';
                    
                    card.find('.card__title, .card__age').remove();
                    
                    // Promo text box
                    if (card.find('.card__promo').length === 0) {
                        var promoBox = $('<div class="card__promo"><div class="card__promo-title">' + titleText + '</div><div class="card__promo-text">' + synopsis + '</div></div>');
                        card.find('.card__view').append(promoBox);
                    }
                    var currentPromoBox = card.find('.card__promo');

                    var showLogos = Lampa.Storage.get('show_logo_instead_of_title', 'false') === 'true' || Lampa.Storage.get('show_logo_instead_of_title', false) === true;
                    if (showLogos && !this.logo_fetched) {
                        this.logo_fetched = true;
                        var logoNet = new Lampa.Reguest();
                        var apiUrl = Lampa.TMDB.api(((movie.method || (movie.name ? 'tv' : 'movie')) === 'tv' ? 'tv/' : 'movie/') + movie.id + '/images?api_key=' + Lampa.TMDB.key() + '&language=' + Lampa.Storage.get('language'));
                        logoNet.silent(apiUrl, function(res) {
                            if (res && res.logos && res.logos.length > 0) {
                                var pngLogo = res.logos.find(l => l.file_path && !l.file_path.endsWith('.svg'));
                                var logoPath = pngLogo ? pngLogo.file_path : res.logos[0].file_path;
                                if (logoPath) {
                                    var selectedHeight = Lampa.Storage.get('info_panel_logo_max_height', '100');
                                    if (!/^\d+$/.test(selectedHeight)) selectedHeight = '100';
                                    var styleAttr = `max-height: ${selectedHeight}px; max-width: 100%; vertical-align: middle; margin-bottom: 0.1em;`;
                                    currentPromoBox.find('.card__promo-title').empty().html(`<img src="${Lampa.TMDB.image('/t/p/original' + logoPath)}" style="${styleAttr}" alt="${titleText} Logo" />`);
                                }
                            }
                        });
                    } else if (!showLogos) {
                        this.logo_fetched = false; 
                        currentPromoBox.find('.card__promo-title').text(titleText);
                    }

                    if (!this.mdblist_fetched) {
                        this.mdblist_fetched = true;
                        fetchRatings({ id: movie.id, method: movie.method || (movie.name ? 'tv' : 'movie') }, function(ratings) {
                            var lineOneDetails = [];
                            var vote = parseFloat((movie.vote_average || 0) + '').toFixed(1);
                            
                            let showImdb = Lampa.Storage.get('show_rating_imdb', true) === true || Lampa.Storage.get('show_rating_imdb', true) === 'true';
                            let showTmdb = Lampa.Storage.get('show_rating_tmdb', true) === true || Lampa.Storage.get('show_rating_tmdb', true) === 'true';
                            let showTomatoes = Lampa.Storage.get('show_rating_tomatoes', false) === true || Lampa.Storage.get('show_rating_tomatoes', false) === 'true';
                            let showAudience = Lampa.Storage.get('show_rating_audience', false) === true || Lampa.Storage.get('show_rating_audience', false) === 'true';
                            let showMetacritic = Lampa.Storage.get('show_rating_metacritic', false) === true || Lampa.Storage.get('show_rating_metacritic', false) === 'true';
                            let showTrakt = Lampa.Storage.get('show_rating_trakt', false) === true || Lampa.Storage.get('show_rating_trakt', false) === 'true';
                            let showLetterboxd = Lampa.Storage.get('show_rating_letterboxd', false) === true || Lampa.Storage.get('show_rating_letterboxd', false) === 'true';
                            let showRogerebert = Lampa.Storage.get('show_rating_rogerebert', false) === true || Lampa.Storage.get('show_rating_rogerebert', false) === 'true';

                            if (showImdb) { lineOneDetails.push('<div class="full-start__rate"><div>' + (ratings && ratings.imdb !== null && typeof ratings.imdb === 'number' ? parseFloat(ratings.imdb || 0).toFixed(1) : '0.0') + '</div><img src="' + imdbLogoUrl + '" class="rating-logo imdb-logo" draggable="false"></div>'); }
                            if (showTmdb) { lineOneDetails.push('<div class="full-start__rate"><div>' + vote + '</div><img src="' + tmdbLogoUrl + '" class="rating-logo tmdb-logo" draggable="false"></div>'); }
                            if (showTomatoes && ratings && typeof ratings.tomatoes === 'number' && ratings.tomatoes !== null) { lineOneDetails.push('<div class="full-start__rate"><div class="rt-score">' + ratings.tomatoes + '</div><img src="' + (ratings.tomatoes >= 60 ? rtFreshLogoUrl : rtRottenLogoUrl) + '" class="rating-logo rt-logo" draggable="false"></div>');  }
                            if (showAudience && ratings && ratings.popcorn != null && !isNaN(parseFloat(ratings.popcorn))) { lineOneDetails.push('<div class="full-start__rate"><div class="rt-audience-score">' + parseFloat(ratings.popcorn) + '</div><img src="' + (parseFloat(ratings.popcorn) >= 60 ? rtAudienceFreshLogoUrl : rtAudienceSpilledLogoUrl) + '" class="rating-logo rt-audience-logo" draggable="false"></div>');  }
                            if (showMetacritic && ratings && typeof ratings.metacritic === 'number' && ratings.metacritic !== null) { lineOneDetails.push('<div class="full-start__rate"><div class="metacritic-score">' + ratings.metacritic + '</div><img src="' + metacriticLogoUrl + '" class="rating-logo metacritic-logo" draggable="false"></div>'); }
                            if (showTrakt && ratings && ratings.trakt != null) { lineOneDetails.push('<div class="full-start__rate"><div class="trakt-score">' + parseFloat(ratings.trakt) + '</div><img src="' + traktLogoUrl + '" class="rating-logo trakt-logo" draggable="false"></div>'); }
                            if (showLetterboxd && ratings && ratings.letterboxd != null) { lineOneDetails.push('<div class="full-start__rate"><div class="letterboxd-score">' + parseFloat(ratings.letterboxd).toFixed(1) + '</div><img src="' + letterboxdLogoUrl + '" class="rating-logo letterboxd-logo" draggable="false"></div>'); }
                            if (showRogerebert && ratings && ratings.rogerebert != null) { lineOneDetails.push('<div class="full-start__rate"><div class="rogerebert-score">' + parseFloat(ratings.rogerebert).toFixed(1) + '</div><img src="' + rogerEbertLogoUrl + '" class="rating-logo rogerebert-logo" draggable="false"></div>'); }

                            card.find('.mdblist-ratings-wrapper').remove();
                            if (lineOneDetails.length > 0) { card.find('.card__view').append('<div class="mdblist-ratings-wrapper">' + lineOneDetails.join('') + '</div>'); }
                        });
                    }
                });
            }
        }, 500); 
    }

    // --- 8. EXACT COPY: Old Plugin Info Panel (create function) ---
    function create() { 
        var html; var timer; var network = new Lampa.Reguest(); var loaded = {}; 
        this.create = function () { html = $("<div class=\"new-interface-info\">\n            <div class=\"new-interface-info__body\">\n                <div class=\"new-interface-info__head\"></div>\n                <div class=\"new-interface-info__title\"></div>\n                <div class=\"new-interface-info__details\"></div>\n                <div class=\"new-interface-info__description\"></div>\n            </div>\n        </div>"); }; 
        this.update = function(data) {
            var _this = this; 
            if (!html || !data || !data.id || !data.title) return;
            html.find('.new-interface-info__head, .new-interface-info__details').text('---'); 
            Lampa.Background.change(Lampa.Api.img(data.backdrop_path, 'w200'));
            delete mdblistRatingsCache[data.id]; delete mdblistRatingsPending[data.id]; 
            html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));
            var showLogos = (Lampa.Storage.get('show_logo_instead_of_title', 'false') === 'true' || Lampa.Storage.get('show_logo_instead_of_title', false) === true);
            var descElement = html.find('.new-interface-info__description');
            if (descElement.length) { var targetLineClamp = showLogos ? '2' : '4'; descElement.css({ '-webkit-line-clamp': targetLineClamp, 'line-clamp': targetLineClamp }); }
            if (showLogos && data.method && data.title) { this.displayLogoOrTitle(data); } else if (data.title) { html.find('.new-interface-info__title').text(data.title); } else { html.find('.new-interface-info__title').empty(); }
            if (data.id && data.method) {
                mdblistRatingsPending[data.id] = true;
                fetchRatings(data, function(mdblistResult) {
                    mdblistRatingsCache[data.id] = mdblistResult;
                    delete mdblistRatingsPending[data.id];
                    var tmdb_url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));
                    if (typeof loaded !== 'undefined' && loaded[tmdb_url]) { _this.draw(loaded[tmdb_url]); }
                });
            }
            this.load(data);
        }; 
        this.draw = function (data) {
            var create_year = ((data.release_date || data.first_air_date || '0000') + '').slice(0, 4);
            var vote = parseFloat((data.vote_average || 0) + '').toFixed(1);
            var head = []; var lineOneDetails = []; var genreDetails = []; 
            var countries = Lampa.Api.sources.tmdb.parseCountries(data);
            var pg = Lampa.Api.sources.tmdb.parsePG(data);
            let showImdb = Lampa.Storage.get('show_rating_imdb', true) === true || Lampa.Storage.get('show_rating_imdb', true) === 'true';
            let showTmdb = Lampa.Storage.get('show_rating_tmdb', true) === true || Lampa.Storage.get('show_rating_tmdb', true) === 'true';
            let showTomatoes = Lampa.Storage.get('show_rating_tomatoes', false) === true || Lampa.Storage.get('show_rating_tomatoes', false) === 'true';
            let showAudience = Lampa.Storage.get('show_rating_audience', false) === true || Lampa.Storage.get('show_rating_audience', false) === 'true';
            let showMetacritic = Lampa.Storage.get('show_rating_metacritic', false) === true || Lampa.Storage.get('show_rating_metacritic', false) === 'true';
            let showTrakt = Lampa.Storage.get('show_rating_trakt', false) === true || Lampa.Storage.get('show_rating_trakt', false) === 'true';
            let showLetterboxd = Lampa.Storage.get('show_rating_letterboxd', false) === true || Lampa.Storage.get('show_rating_letterboxd', false) === 'true';
            let showRogerebert = Lampa.Storage.get('show_rating_rogerebert', false) === true || Lampa.Storage.get('show_rating_rogerebert', false) === 'true';

            if (create_year !== '0000') head.push('<span>' + create_year + '</span>');
            if (countries.length > 0) head.push(countries.join(', '));
            var mdblistResult = mdblistRatingsCache[data.id];

            if (showImdb) { lineOneDetails.push('<div class="full-start__rate imdb-rating-item"><div>' + (mdblistResult && mdblistResult.imdb !== null && typeof mdblistResult.imdb === 'number' ? parseFloat(mdblistResult.imdb || 0).toFixed(1) : '0.0') + '</div><img src="' + imdbLogoUrl + '" class="rating-logo imdb-logo" draggable="false"></div>'); }
            if (showTmdb) { lineOneDetails.push('<div class="full-start__rate tmdb-rating-item"><div>' + vote + '</div><img src="' + tmdbLogoUrl + '" class="rating-logo tmdb-logo" draggable="false"></div>'); }
            if (showTomatoes && mdblistResult && typeof mdblistResult.tomatoes === 'number' && mdblistResult.tomatoes !== null) { lineOneDetails.push('<div class="full-start__rate rt-rating-item"><div class="rt-score">' + mdblistResult.tomatoes + '</div><img src="' + (mdblistResult.tomatoes >= 60 ? rtFreshLogoUrl : rtRottenLogoUrl) + '" class="rating-logo rt-logo" draggable="false"></div>'); }
            if (showAudience && mdblistResult && mdblistResult.popcorn != null && !isNaN(parseFloat(mdblistResult.popcorn))) { lineOneDetails.push('<div class="full-start__rate rt-audience-rating-item"><div class="rt-audience-score">' + parseFloat(mdblistResult.popcorn) + '</div><img src="' + (parseFloat(mdblistResult.popcorn) >= 60 ? rtAudienceFreshLogoUrl : rtAudienceSpilledLogoUrl) + '" class="rating-logo rt-audience-logo" draggable="false"></div>'); }
            if (showMetacritic && mdblistResult && typeof mdblistResult.metacritic === 'number' && mdblistResult.metacritic !== null) { lineOneDetails.push('<div class="full-start__rate metacritic-rating-item"><div class="metacritic-score">' + mdblistResult.metacritic + '</div><img src="' + metacriticLogoUrl + '" class="rating-logo metacritic-logo" draggable="false"></div>'); }
            if (showTrakt && mdblistResult && mdblistResult.trakt != null && !isNaN(parseFloat(mdblistResult.trakt))) { lineOneDetails.push('<div class="full-start__rate trakt-rating-item"><div class="trakt-score">' + parseFloat(mdblistResult.trakt) + '</div><img src="' + traktLogoUrl + '" class="rating-logo trakt-logo" draggable="false"></div>'); }
            if (showLetterboxd && mdblistResult && mdblistResult.letterboxd != null && !isNaN(parseFloat(mdblistResult.letterboxd))) { lineOneDetails.push('<div class="full-start__rate letterboxd-rating-item"><div class="letterboxd-score">' + parseFloat(mdblistResult.letterboxd).toFixed(1) + '</div><img src="' + letterboxdLogoUrl + '" class="rating-logo letterboxd-logo" draggable="false"></div>'); }
            if (showRogerebert && mdblistResult && mdblistResult.rogerebert != null && !isNaN(parseFloat(mdblistResult.rogerebert))) { lineOneDetails.push('<div class="full-start__rate rogerebert-rating-item"><div class="rogerebert-score">' + parseFloat(mdblistResult.rogerebert).toFixed(1) + '</div><img src="' + rogerEbertLogoUrl + '" class="rating-logo rogerebert-logo" draggable="false"></div>'); }

            if (data.runtime) { lineOneDetails.push(Lampa.Utils.secondsToTime(data.runtime * 60, true)); }
            if (pg) { lineOneDetails.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + '</span>'); }
            if (data.genres && data.genres.length > 0) { genreDetails.push(data.genres.map(function (item) { return Lampa.Utils.capitalizeFirstLetter(item.name); }).join(' | ')); }
            html.find('.new-interface-info__head').empty().append(head.join(', '));
            let lineOneHtml = lineOneDetails.join('<span class="new-interface-info__split">&#9679;</span>');
            let genresHtml = genreDetails.length > 0 ? genreDetails[0] : '';
            let finalDetailsHtml = '';
            if (lineOneDetails.length > 0) { finalDetailsHtml += `<div class="line-one-details">${lineOneHtml}</div>`; }
            if (genresHtml) { finalDetailsHtml += `<div class="genre-details-line">${genresHtml}</div>`; }
            html.find('.new-interface-info__details').html(finalDetailsHtml);
        }; 
        this.load = function (data) {
            var _this = this; clearTimeout(timer); 
            var url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));
            if (loaded[url]) return this.draw(loaded[url]); 
            timer = setTimeout(function () { network.clear(); network.timeout(5000); network.silent(url, function (movie) { loaded[url] = movie; if (!movie.method) movie.method = data.name ? 'tv' : 'movie'; _this.draw(movie); }); }, 300); 
        };
        this.render = function () { return html; };
        this.displayLogoOrTitle = function(movieData) {
            if (!html) return; 
            var titleElement = html.find('.new-interface-info__title');
            if (!titleElement.length) return; 
            if (!movieData || !movieData.id || !movieData.method || !movieData.title) { titleElement.empty(); return; }
            titleElement.text(movieData.title); 
            var apiKey = Lampa.TMDB.key(); var language = Lampa.Storage.get('language');
            var apiUrl = Lampa.TMDB.api((movieData.method === 'tv' ? 'tv/' : 'movie/') + movieData.id + '/images?api_key=' + apiKey + '&language=' + language);
            var myNet = new Lampa.Reguest();
            myNet.timeout(config.request_timeout || 7000);
            myNet.silent(apiUrl, function (response) { 
                var logoPath = null;
                if (response && response.logos && response.logos.length > 0) {
                    var pngLogo = response.logos.find(logo => logo.file_path && !logo.file_path.endsWith('.svg'));
                    logoPath = pngLogo ? pngLogo.file_path : response.logos[0].file_path;
                }
                var currentTitleElement = html ? html.find('.new-interface-info__title') : null;
                if (currentTitleElement && currentTitleElement.length) {
                    if (logoPath) {
                         var selectedHeight = Lampa.Storage.get('info_panel_logo_max_height', '100'); 
                         if (!/^\d+$/.test(selectedHeight)) { selectedHeight = '100'; }
                         var styleAttr = `max-height: ${selectedHeight}px; max-width: 100%; vertical-align: middle; margin-bottom: 0.1em;`;
                         currentTitleElement.empty().html(`<img src="${Lampa.TMDB.image('/t/p/original' + logoPath)}" style="${styleAttr}" alt="${movieData.title} Logo" />`);
                    } else { currentTitleElement.text(movieData.title); }
                }
            }, function() { var ct = html ? html.find('.new-interface-info__title') : null; if(ct && ct.length && movieData && movieData.title) ct.text(movieData.title); }); 
        }; 
        this.empty = function () {};
        this.destroy = function () { html.remove(); loaded = {}; html = null; mdblistRatingsCache = {}; mdblistRatingsPending = {}; }; 
    }

    // --- 9. EXACT COPY: Old Plugin Grid Replacement (component function) ---
    function component(object) { 
        var network = new Lampa.Reguest(); var scroll = new Lampa.Scroll({ mask: true, over: true, scroll_by_item: true }); 
        var items = []; var html = $('<div class="new-interface"><img class="full-start__background"></div>'); 
        var active = 0; var newlampa = Lampa.Manifest.app_digital >= 166; 
        var info; var lezydata; var viewall = Lampa.Storage.field('card_views_type') == 'view' || Lampa.Storage.field('navigation_type') == 'mouse'; 
        var background_img = html.find('.full-start__background'); var background_last = ''; var background_timer; 
        this.create = function () {}; 
        this.empty = function () { 
            var button; 
            if (object.source == 'tmdb') { button = $('<div class="empty__footer"><div class="simple-button selector">' + Lampa.Lang.translate('change_source_on_cub') + '</div></div>'); button.find('.selector').on('hover:enter', function () { Lampa.Storage.set('source', 'cub'); Lampa.Activity.replace({ source: 'cub' }); }); } 
            var empty = new Lampa.Empty(); html.append(empty.render(button)); this.start = empty.start; this.activity.loader(false); this.activity.toggle(); 
        }; 
        this.loadNext = function () {
            var _this = this; 
            if (this.next && !this.next_wait && items.length) { this.next_wait = true; this.next(function (new_data) { _this.next_wait = false; new_data.forEach(_this.append.bind(_this)); Lampa.Layer.visible(items[active + 1].render(true)); }, function () { _this.next_wait = false; }); } 
        }; 
        this.push = function () {}; 
        this.build = function (data) {
            var _this2 = this; lezydata = data; info = new create(object); info.create(); scroll.minus(info.render()); 
            data.slice(0, viewall ? data.length : 2).forEach(this.append.bind(this)); html.append(info.render()); html.append(scroll.render()); 
            if (newlampa) { Lampa.Layer.update(html); Lampa.Layer.visible(scroll.render(true)); scroll.onEnd = this.loadNext.bind(this); scroll.onWheel = function (step) { if (!Lampa.Controller.own(_this2)) _this2.start(); if (step > 0) _this2.down(); else if (active > 0) _this2.up(); }; } 
            if (items.length > 0 && items[0] && items[0].data) { active = 0; info.update(items[active].data); this.background(items[active].data); }    
            this.activity.loader(false); this.activity.toggle(); 
        }; 
        this.background = function (elem) {
            if (!elem || !elem.backdrop_path) return; 
            var new_background = Lampa.Api.img(elem.backdrop_path, 'w1280'); 
            clearTimeout(background_timer); 
            if (new_background == background_last) return; 
            background_timer = setTimeout(function () { background_img.removeClass('loaded'); background_img[0].onload = function () { background_img.addClass('loaded'); }; background_img[0].onerror = function () { background_img.removeClass('loaded'); }; background_last = new_background; setTimeout(function () { if (background_img[0]) background_img[0].src = background_last; }, 300); }, 1000); 
        }; 
        this.append = function (element) {
            if (element.ready) return; var _this3 = this; element.ready = true; 
            var item = new Lampa.InteractionLine(element, { url: element.url, card_small: true, cardClass: element.cardClass, genres: object.genres, object: object, card_wide: true, nomore: element.nomore }); 
            item.create(); item.onDown = this.down.bind(this); item.onUp = this.up.bind(this); item.onBack = this.back.bind(this); 
            item.onToggle = function () { active = items.indexOf(item); }; 
            if (this.onMore) item.onMore = this.onMore.bind(this); 
            item.onFocus = function (elem) { if (!elem.method) elem.method = elem.name ? 'tv' : 'movie'; info.update(elem); _this3.background(elem); }; 
            item.onHover = function (elem) { if (!elem.method) elem.method = elem.name ? 'tv' : 'movie'; info.update(elem); _this3.background(elem); }; 
            item.onFocusMore = info.empty.bind(info); scroll.append(item.render()); items.push(item); 
        }; 
        this.back = function () { Lampa.Activity.backward(); }; 
        this.down = function () { active++; active = Math.min(active, items.length - 1); if (!viewall && lezydata) lezydata.slice(0, active + 2).forEach(this.append.bind(this)); items[active].toggle(); scroll.update(items[active].render()); }; 
        this.up = function () { active--; if (active < 0) { active = 0; Lampa.Controller.toggle('head'); } else { items[active].toggle(); scroll.update(items[active].render()); } }; 
        this.start = function () {
            var _this4 = this; 
            Lampa.Controller.add('content', { link: this, toggle: function toggle() { if (_this4.activity.canRefresh()) return false; if (items.length) { items[active].toggle(); } }, update: function update() {}, left: function left() { if (Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); }, right: function right() { Navigator.move('right'); }, up: function up() { if (Navigator.canmove('up')) Navigator.move('up'); else Lampa.Controller.toggle('head'); }, down: function down() { if (Navigator.canmove('down')) Navigator.move('down'); }, back: this.back }); 
            Lampa.Controller.toggle('content'); 
        }; 
        this.refresh = function () { this.activity.loader(true); this.activity.need_refresh = true; }; 
        this.pause = function () {}; this.stop = function () {}; this.render = function () { return html; }; 
        this.destroy = function () { clearTimeout(background_timer); network.clear(); Lampa.Arrays.destroy(items); scroll.destroy(); if (info) info.destroy(); if (html) html.remove(); items = null; network = null; lezydata = null; info = null; html = null; }; 
    }

    // --- 10. EXACT COPY: Old Plugin Init & Full Listener ---
    function startPlugin() {
        if (!window.Lampa || !Lampa.Utils || !Lampa.Lang || !Lampa.Storage || !Lampa.TMDB || !Lampa.Template || !Lampa.Reguest || !Lampa.Api || !Lampa.InteractionLine || !Lampa.Scroll || !Lampa.Activity || !Lampa.Controller) { return; }
        window.plugin_interface_ready = true; 
        
        var old_interface = Lampa.InteractionMain; var new_interface = component;
        var masterNet = new Lampa.Reguest();
        
        if (Lampa.Listener && masterNet) { 
            Lampa.Listener.follow("full", function(eventData) {
                var storageKey = 'show_logo_instead_of_title';
                try {
                    var showLogos = (Lampa.Storage.get(storageKey, 'false') === 'true' || Lampa.Storage.get(storageKey, false) === true);
                    if (eventData.type === 'complite' && showLogos) {
                        var movie = eventData.data.movie;
                        if (movie && movie.id && movie.title) {
                            movie.method = movie.name ? 'tv' : 'movie'; 
                            var id = movie.id;
                            var initialTargetElement = $(eventData.object.activity.render()).find(".full-start-new__title");
                            if (initialTargetElement.length > 0) {
                                initialTargetElement.text(movie.title);
                                var apiKey = Lampa.TMDB.key(); var language = Lampa.Storage.get('language');
                                var apiUrl = Lampa.TMDB.api((movie.method === 'tv' ? 'tv/' : 'movie/') + id + '/images?api_key=' + apiKey + '&language=' + language);
                                masterNet.clear(); masterNet.timeout(config.request_timeout || 7000);
                                masterNet.silent(apiUrl, function (response) { 
                                    var logoPath = null;
                                    if (response && response.logos && response.logos.length > 0) {
                                        var pngLogo = response.logos.find(logo => logo.file_path && !logo.file_path.endsWith('.svg'));
                                        logoPath = pngLogo ? pngLogo.file_path : response.logos[0].file_path;
                                    }
                                    var currentTargetElement = $(eventData.object.activity.render()).find(".full-start-new__title");
                                    if (currentTargetElement.length > 0) {
                                        if (logoPath) {
                                            var selectedHeight = Lampa.Storage.get('info_panel_logo_max_height', '60'); 
                                            if (!/^\d+$/.test(selectedHeight)) { selectedHeight = '75'; } 
                                            var styleAttr = `margin-top: 5px; max-height: ${selectedHeight}px; max-width: 100%; vertical-align: middle;`; 
                                            currentTargetElement.empty().html(`<img src="${Lampa.TMDB.image('/t/p/original' + logoPath)}" style="${styleAttr}" alt="${movie.title} Logo" />`);
                                        } else { currentTargetElement.text(movie.title); }
                                    }
                                }, function() { 
                                     var currentTargetElement = $(eventData.object.activity.render()).find(".full-start-new__title");
                                      if (currentTargetElement && currentTargetElement.length) currentTargetElement.text(movie.title);
                                }); 
                            } 
                        } 
                    } 
                } catch (e) { }
            }); 
        }
    
        Lampa.InteractionMain = function (object) { 
            var use = new_interface; 
            if (!(object.source == 'tmdb' || object.source == 'cub')) use = old_interface; 
            if (window.innerWidth < 767) use = old_interface; 
            if (!Lampa.Account.hasPremium()) use = old_interface; 
            if (Lampa.Manifest.app_digital < 153) use = old_interface; 
            return new use(object); 
        };

        var style_id = 'new_interface_style_adjusted_padding'; 
        if (!$('style[data-id="' + style_id + '"]').length) {
             $('style[data-id^="new_interface_style_"]').remove(); 
            Lampa.Template.add(style_id, `
            <style data-id="${style_id}">
            .new-interface .card--small.card--wide { width: 18.3em; }
            .new-interface-info { position: relative; padding: 1.5em; height: 24em; } 
            .new-interface-info__body { width: 80%; padding-top: 1.1em; }
            .new-interface-info__head { color: rgba(255, 255, 255, 0.6); margin-bottom: 1em; font-size: 1.3em; min-height: 1em; }
            .new-interface-info__head span { color: #fff; }
            .new-interface-info__title { font-size: 4em; font-weight: 600; margin-bottom: 0.3em; overflow: hidden; text-overflow: "."; display: -webkit-box; -webkit-line-clamp: 1; line-clamp: 1; -webkit-box-orient: vertical; margin-left: -0.03em; line-height: 1.3; }
            .new-interface-info__details { margin-bottom: 1em; display: block; min-height: 1.9em; font-size: 1.1em; }
            .line-one-details { margin-bottom: 0.6em; line-height: 1.5; }
            .genre-details-line { margin-top: 1em; line-height: 1.5; }
            .new-interface-info__split { margin: 0 0.5em; font-size: 0.7em; }
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
            .new-interface .full-start__rate { font-size: 1.3em; margin-right: 0em; display: inline-flex; align-items: center; vertical-align: middle; background-color: rgba(255, 255, 255, 0.12); padding: 0 0.2em 0 0; border-radius: 0.3em; gap: 0.4em; overflow: hidden; height: auto; }
            .new-interface .full-start__rate > div { font-weight: normal; font-size: 0.9em; justify-content: center; background-color: rgba(0, 0, 0, 0.4); color: #ffffff; padding: 0em 0.2em; border-radius: 0.3em; line-height: 1; order: 1; display: flex; align-items: center; flex-shrink: 0; }
            .rating-logo { height: 1.1em; width: auto; max-width: 75px; vertical-align: middle; order: 2; line-height: 0; }
            .tmdb-logo { height: 0.9em; }
            .rt-logo { height: 1.1em; }
            </style>
            `);
          $('body').append(Lampa.Template.get(style_id, {}, true));
        }
    }

    if (!window.plugin_interface_ready) startPlugin();
    setTimeout(applyWideDOM, 500); // Start our Grid Watcher
})();
