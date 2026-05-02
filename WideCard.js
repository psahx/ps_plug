// == Lampa Homepage MDBList Phase 2 (Silent Fetch) ==
(function () {
    'use strict';

    // --- 1. Fetcher Configuration (Master Script) ---
    var config = {
        api_url: 'https://api.mdblist.com/tmdb/', 
        cache_time: 60 * 60 * 12 * 1000, // 12 hours cache
        cache_key: 'mdblist_ratings_cache', 
        cache_limit: 500, 
        request_timeout: 10000 
    };

    var network = (window.Lampa && Lampa.Reguest) ? new Lampa.Reguest() : null;

    // --- 2. Language & Settings UI (Master Script) ---
    if (window.Lampa && Lampa.Lang) {
        Lampa.Lang.add({
            mdblist_api_key_desc: { ru: "Введите ваш API ключ", en: "Enter your API key", uk: "Введіть ваш API ключ" },
            additional_ratings_title: { ru: "Дополнительные Рейтинги", en: "Additional Ratings", uk: "Додаткові Рейтинги" }
            // Abbreviated for Phase 2, full strings will return in Phase 3
        });
    }

    if (window.Lampa && Lampa.SettingsApi) {
        Lampa.SettingsApi.addComponent({
            component: 'additional_ratings',
            name: Lampa.Lang.translate('additional_ratings_title'),
            icon: '<svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: 'additional_ratings', 
            param: { name: 'mdblist_api_key', type: 'input', 'default': '', placeholder: 'Enter API Key' },
            field: { name: 'MDBList API Key', description: Lampa.Lang.translate('mdblist_api_key_desc') },
            onChange: function() { Lampa.Settings.update(); }
        });
    }

    // --- 3. Caching Functions (Master Script) ---
    function getCache(tmdb_id) {
        if (!window.Lampa || !Lampa.Storage) return false;
        var timestamp = new Date().getTime();
        var cache = Lampa.Storage.cache(config.cache_key, config.cache_limit, {}); 

        if (cache[tmdb_id]) {
            if ((timestamp - cache[tmdb_id].timestamp) > config.cache_time) {
                delete cache[tmdb_id];
                Lampa.Storage.set(config.cache_key, cache); 
                return false;
            } 
          return cache[tmdb_id].data; 
        }
        return false;
    }

    function setCache(tmdb_id, data) {
        if (!window.Lampa || !Lampa.Storage) return;
        var timestamp = new Date().getTime();
        var cache = Lampa.Storage.cache(config.cache_key, config.cache_limit, {});
        cache[tmdb_id] = { timestamp: timestamp, data: data };
        Lampa.Storage.set(config.cache_key, cache); 
    }

    // --- 4. Core Fetching Logic (Master Script) ---
    function fetchRatings(movieData, callback) {
        if (!network) return callback({ error: "Network unavailable" });
        if (!movieData || !movieData.id || !movieData.method) return callback({ error: "Invalid input" });

        var tmdb_id = movieData.id;
        var cached_ratings = getCache(tmdb_id);
        if (cached_ratings) return callback(cached_ratings);

        var apiKey = Lampa.Storage.get('mdblist_api_key');
        if (!apiKey) return callback({ error: "No API Key configured" });

        var media_type = movieData.method === 'tv' ? 'show' : 'movie';
        var api_url = "".concat(config.api_url).concat(media_type, "/").concat(tmdb_id, "?apikey=").concat(apiKey);
        
        network.clear(); 
        network.timeout(config.request_timeout);
        network.silent(api_url, function (response) {
            var ratingsResult = { error: null }; 
            if (response && response.ratings && Array.isArray(response.ratings)) {
                 response.ratings.forEach(function(rating) {
                     if (rating.source && rating.value !== null) ratingsResult[rating.source] = rating.value;
                 });
            } else if (response && response.error) {
                ratingsResult.error = "API Error: " + response.error;
            } else {
                 ratingsResult.error = "Invalid format";
            }

            if (ratingsResult.error === null || (ratingsResult.error && !ratingsResult.error.toLowerCase().includes("invalid api key"))) {
                 setCache(tmdb_id, ratingsResult);
            }
            callback(ratingsResult);
        }, function (xhr, status) {
            var errorMessage = "Request failed (Status: " + status + ")";
            var errorResult = { error: errorMessage };
            if (status !== 401 && status !== 403) setCache(tmdb_id, errorResult);
            callback(errorResult);
        }); 
    }

    // --- 5. The V14 Layout Watcher + Silent Hook ---
    function applyWideDOM() {
        setInterval(function() {
            var activity = window.Lampa && Lampa.Activity ? Lampa.Activity.active() : null;
            
            if (activity && (activity.component === 'main' || activity.component === 'category')) {
                
                $('.card:not(.card--wide):visible').each(function() {
                    var card = $(this);
                    var movie = this.card_data; 
                    if (!movie || !movie.id) return; 

                    // 1. V14 Layout Changes
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
                    card.find('.card__view').append(
                        '<div class="card__promo">' + 
                            '<div class="card__promo-title">' + titleText + '</div>' + 
                            '<div class="card__promo-text">' + synopsis + '</div>' + 
                        '</div>'
                    );

                    // 2. The Phase 2 Silent Fetch Hook
                    // Use a flag directly on the HTML element so we only fetch once per card instance
                    if (!this.mdblist_fetched) {
                        this.mdblist_fetched = true;
                        
                        var method = movie.method || (movie.name ? 'tv' : 'movie');
                        
                        fetchRatings({ id: movie.id, method: method }, function(ratings) {
                            if (ratings.error) {
                                console.log("🔴 [MDBList Error] " + titleText + ": " + ratings.error);
                            } else {
                                var scores = [];
                                if (ratings.imdb) scores.push("IMDb: " + ratings.imdb);
                                if (ratings.tomatoes) scores.push("RT: " + ratings.tomatoes);
                                if (ratings.metacritic) scores.push("Meta: " + ratings.metacritic);
                                
                                console.log("🟢 [MDBList Success] " + titleText + " | " + (scores.length ? scores.join(" | ") : "No scores"));
                            }
                        });
                    }
                });
            }
        }, 500); 
    }

    setTimeout(applyWideDOM, 500);
})();
