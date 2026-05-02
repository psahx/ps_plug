// == Lampa Homepage MDBList Phase 3 (Visual Injection) ==
(function () {
    'use strict';

    // --- 1. Global CSS Injection for Rating Badges ---
    if (!$('style[data-id="mdblist_homepage_cards"]').length) {
        $('head').append(`
        <style data-id="mdblist_homepage_cards">
            /* Hide Lampa's native rating badge */
            .card--wide .card__vote { display: none !important; }
            
            /* Container for our custom array */
            .mdblist-ratings-wrapper { position: absolute; bottom: 0.5em; left: 0.5em; display: flex; flex-direction: column; gap: 0.3em; z-index: 10; align-items: flex-start; }
            
            /* Your exact master script rating styles */
            .mdblist-ratings-wrapper .full-start__rate { font-size: 1.1em; display: inline-flex; align-items: center; vertical-align: middle; background-color: rgba(255, 255, 255, 0.12); padding: 0 0.2em 0 0; border-radius: 0.3em; gap: 0.4em; overflow: hidden; height: auto; }
            .mdblist-ratings-wrapper .full-start__rate > div { font-weight: normal; font-size: 0.9em; justify-content: center; background-color: rgba(0, 0, 0, 0.4); color: #ffffff; padding: 0em 0.2em; border-radius: 0.3em; line-height: 1; order: 1; display: flex; align-items: center; flex-shrink: 0; }
            .mdblist-ratings-wrapper .rating-logo { height: 1.1em; width: auto; max-width: 75px; vertical-align: middle; order: 2; line-height: 0; }
            .mdblist-ratings-wrapper .tmdb-logo { height: 0.9em; }
            .mdblist-ratings-wrapper .rt-logo { height: 1.1em; }
        </style>
        `);
    }

    // --- 2. Master Script Variables ---
    var config = {
        api_url: 'https://api.mdblist.com/tmdb/', 
        cache_time: 60 * 60 * 12 * 1000, 
        cache_key: 'mdblist_ratings_cache', 
        cache_limit: 500, 
        request_timeout: 10000 
    };

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

    // --- 3. Language Strings (EXACT COPY) ---
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
            info_panel_logo_height_desc: { ru: "Максимальная высота логотипа", en: "Maximum logo height", uk: "Максимальна высота логотипу" }
        });
    }

    // --- 4. Settings UI Registration (EXACT COPY) ---
    if (window.Lampa && Lampa.SettingsApi) {
        Lampa.SettingsApi.addComponent({
            component: 'additional_ratings',
            name: Lampa.Lang.translate('additional_ratings_title'),
            icon: '<svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: 'additional_ratings', 
            param: { name: 'mdblist_api_key', type: 'input', 'default': '', placeholder: 'Enter your MDBList API Key' },
            field: { name: 'MDBList API Key', description: Lampa.Lang.translate('mdblist_api_key_desc') },
            onChange: function() { Lampa.Settings.update(); }
        });

        Lampa.SettingsApi.addParam({
            component: 'additional_ratings', 
            param: { name: 'select_ratings_button', type: 'button' },
            field: { name: Lampa.Lang.translate('select_ratings_button_name'), description: Lampa.Lang.translate('select_ratings_button_desc') },
            onChange: function () { showRatingProviderSelection(); }
        });
                
        Lampa.SettingsApi.addParam({
            component: 'additional_ratings',        
            param: { name: 'show_logo_instead_of_title', type: 'select', values: { 'true': Lampa.Lang.translate('settings_show'), 'false': Lampa.Lang.translate('settings_hide') }, 'default': 'false' },
            field: { name: Lampa.Lang.translate('logo_toggle_name'), description: Lampa.Lang.translate('logo_toggle_desc') },
            onChange: function(value) { Lampa.Storage.set('show_logo_instead_of_title', value); }
        });
                
        Lampa.SettingsApi.addParam({
            component: 'additional_ratings', 
            param: { name: 'info_panel_logo_max_height', type: 'select', values: { '50': '50px', '75': '75px', '100': '100px', '125': '125px', '150': '150px', '175': '175px', '200': '200px', '250': '250px', '300': '300px' }, 'default': '100' },
            field: { name: Lampa.Lang.translate('info_panel_logo_height_name'), description: Lampa.Lang.translate('info_panel_logo_height_desc') },
            onChange: function(value) { Lampa.Storage.set('info_panel_logo_max_height', value); }
        });
    }

    // --- 5. Rating Selection Dialog (EXACT COPY) ---
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

        let selectItems = providers.map(provider => {
            let storedValue = Lampa.Storage.get(provider.id, provider.default);
            return { title: provider.title, id: provider.id, checkbox: true, checked: (storedValue === true || storedValue === 'true'), default: provider.default };
        });

        var currentController = Lampa.Controller.enabled().name;
        Lampa.Select.show({
            title: Lampa.Lang.translate('select_ratings_dialog_title'), 
            items: selectItems,                                        
            onBack: function () { Lampa.Controller.toggle(currentController || 'settings'); },
            onCheck: function (item) { 
                let newState = !(Lampa.Storage.get(item.id, item.default) === true || Lampa.Storage.get(item.id, item.default) === 'true');
                Lampa.Storage.set(item.id, newState);
                item.checked = newState;
            }
        });
    }

    // --- 6. Caching & Fetching Functions ---
    function getCache(tmdb_id) {
        if (!window.Lampa || !Lampa.Storage) return false;
        var cache = Lampa.Storage.cache(config.cache_key, config.cache_limit, {}); 
        if (cache[tmdb_id]) {
            if ((new Date().getTime() - cache[tmdb_id].timestamp) > config.cache_time) {
                delete cache[tmdb_id]; Lampa.Storage.set(config.cache_key, cache); return false;
            } 
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
        // Isolated network request for grid loading
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
            if (response && response.ratings && Array.isArray(response.ratings)) {
                 response.ratings.forEach(function(rating) {
                     if (rating.source && rating.value !== null) ratingsResult[rating.source] = rating.value;
                 });
            } else if (response && response.error) { ratingsResult.error = response.error; }
            if (!ratingsResult.error || !ratingsResult.error.toLowerCase().includes("invalid api key")) setCache(movieData.id, ratingsResult);
            callback(ratingsResult);
        }, function () { callback({ error: "Network Failed" }); }); 
    }

    // --- 7. The V14 Watcher & Visual Injector ---
    function applyWideDOM() {
        setInterval(function() {
            var activity = window.Lampa && Lampa.Activity ? Lampa.Activity.active() : null;
            if (activity && (activity.component === 'main' || activity.component === 'category')) {
                
                $('.card:not(.card--wide):visible').each(function() {
                    var card = $(this);
                    var movie = this.card_data; 
                    if (!movie || !movie.id) return; 

                    // 1. Convert to Wide Layout
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
                    
                    // Promo wrapper holding the text/logo
                    var promoBox = $('<div class="card__promo"><div class="card__promo-title">' + titleText + '</div><div class="card__promo-text">' + synopsis + '</div></div>');
                    card.find('.card__view').append(promoBox);

                    // 2. Fetch and Inject TMDB Logo (If Enabled)
                    var showLogos = Lampa.Storage.get('show_logo_instead_of_title', 'false') === 'true' || Lampa.Storage.get('show_logo_instead_of_title', false) === true;
                    if (showLogos) {
                        var logoNet = new Lampa.Reguest();
                        var method = movie.method || (movie.name ? 'tv' : 'movie');
                        var apiUrl = Lampa.TMDB.api((method === 'tv' ? 'tv/' : 'movie/') + movie.id + '/images?api_key=' + Lampa.TMDB.key() + '&language=' + Lampa.Storage.get('language'));
                        
                        logoNet.silent(apiUrl, function(res) {
                            if (res && res.logos && res.logos.length > 0) {
                                var pngLogo = res.logos.find(l => l.file_path && !l.file_path.endsWith('.svg'));
                                var logoPath = pngLogo ? pngLogo.file_path : res.logos[0].file_path;
                                if (logoPath) {
                                    var selectedHeight = Lampa.Storage.get('info_panel_logo_max_height', '100');
                                    if (!/^\d+$/.test(selectedHeight)) selectedHeight = '100';
                                    var styleAttr = `max-height: ${selectedHeight}px; max-width: 100%; vertical-align: middle; margin-bottom: 0.1em;`;
                                    promoBox.find('.card__promo-title').empty().html(`<img src="${Lampa.TMDB.image('/t/p/original' + logoPath)}" style="${styleAttr}" alt="${titleText} Logo" />`);
                                }
                            }
                        });
                    }

                    // 3. Fetch and Inject MDBList Ratings
                    if (!this.mdblist_fetched) {
                        this.mdblist_fetched = true;
                        
                        fetchRatings({ id: movie.id, method: movie.method || (movie.name ? 'tv' : 'movie') }, function(ratings) {
                            var lineOneDetails = [];
                            var vote = parseFloat((movie.vote_average || 0) + '').toFixed(1);
                            
                            // Check Toggles
                            let showImdb = Lampa.Storage.get('show_rating_imdb', true) === true || Lampa.Storage.get('show_rating_imdb', true) === 'true';
                            let showTmdb = Lampa.Storage.get('show_rating_tmdb', true) === true || Lampa.Storage.get('show_rating_tmdb', true) === 'true';
                            let showTomatoes = Lampa.Storage.get('show_rating_tomatoes', false) === true || Lampa.Storage.get('show_rating_tomatoes', false) === 'true';
                            let showAudience = Lampa.Storage.get('show_rating_audience', false) === true || Lampa.Storage.get('show_rating_audience', false) === 'true';
                            let showMetacritic = Lampa.Storage.get('show_rating_metacritic', false) === true || Lampa.Storage.get('show_rating_metacritic', false) === 'true';
                            let showTrakt = Lampa.Storage.get('show_rating_trakt', false) === true || Lampa.Storage.get('show_rating_trakt', false) === 'true';
                            let showLetterboxd = Lampa.Storage.get('show_rating_letterboxd', false) === true || Lampa.Storage.get('show_rating_letterboxd', false) === 'true';
                            let showRogerebert = Lampa.Storage.get('show_rating_rogerebert', false) === true || Lampa.Storage.get('show_rating_rogerebert', false) === 'true';

                            if (showImdb) {
                                var imdbRating = ratings && ratings.imdb !== null && typeof ratings.imdb === 'number' ? parseFloat(ratings.imdb || 0).toFixed(1) : '0.0';
                                lineOneDetails.push('<div class="full-start__rate"><div>' + imdbRating + '</div><img src="' + imdbLogoUrl + '" class="rating-logo imdb-logo" draggable="false"></div>');
                            }
                            if (showTmdb) {
                                lineOneDetails.push('<div class="full-start__rate"><div>' + vote + '</div><img src="' + tmdbLogoUrl + '" class="rating-logo tmdb-logo" draggable="false"></div>');
                            }
                            if (showTomatoes && ratings && typeof ratings.tomatoes === 'number' && ratings.tomatoes !== null) {
                                 let logoUrl = ratings.tomatoes >= 60 ? rtFreshLogoUrl : rtRottenLogoUrl; 
                                 lineOneDetails.push('<div class="full-start__rate"><div class="rt-score">' + ratings.tomatoes + '</div><img src="' + logoUrl + '" class="rating-logo rt-logo" draggable="false"></div>'); 
                            }
                            if (showAudience && ratings && ratings.popcorn != null && !isNaN(parseFloat(ratings.popcorn))) {
                                 let score = parseFloat(ratings.popcorn);
                                 let logoUrl = score >= 60 ? rtAudienceFreshLogoUrl : rtAudienceSpilledLogoUrl; 
                                 lineOneDetails.push('<div class="full-start__rate"><div class="rt-audience-score">' + score + '</div><img src="' + logoUrl + '" class="rating-logo rt-audience-logo" draggable="false"></div>'); 
                            }
                            if (showMetacritic && ratings && typeof ratings.metacritic === 'number' && ratings.metacritic !== null) {
                                 lineOneDetails.push('<div class="full-start__rate"><div class="metacritic-score">' + ratings.metacritic + '</div><img src="' + metacriticLogoUrl + '" class="rating-logo metacritic-logo" draggable="false"></div>'); 
                            }
                            if (showTrakt && ratings && ratings.trakt != null) {
                                 lineOneDetails.push('<div class="full-start__rate"><div class="trakt-score">' + parseFloat(ratings.trakt) + '</div><img src="' + traktLogoUrl + '" class="rating-logo trakt-logo" draggable="false"></div>'); 
                            }
                            if (showLetterboxd && ratings && ratings.letterboxd != null) {
                                 lineOneDetails.push('<div class="full-start__rate"><div class="letterboxd-score">' + parseFloat(ratings.letterboxd).toFixed(1) + '</div><img src="' + letterboxdLogoUrl + '" class="rating-logo letterboxd-logo" draggable="false"></div>'); 
                            }
                            if (showRogerebert && ratings && ratings.rogerebert != null) {
                                 lineOneDetails.push('<div class="full-start__rate"><div class="rogerebert-score">' + parseFloat(ratings.rogerebert).toFixed(1) + '</div><img src="' + rogerEbertLogoUrl + '" class="rating-logo rogerebert-logo" draggable="false"></div>'); 
                            }

                            if (lineOneDetails.length > 0) {
                                card.find('.card__view').append('<div class="mdblist-ratings-wrapper">' + lineOneDetails.join('') + '</div>');
                            }
                        });
                    }
                });
            }
        }, 500); 
    }

    setTimeout(applyWideDOM, 500);
})();
