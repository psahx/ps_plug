(function () {
    'use strict';

    // --- This is the SECOND script, modified ---

    function rating_kp_imdb(card) {
        // --- All the fetching logic remains the same ---
        var network = new Lampa.Reguest();
        // ... (kpCleanTitle, search_date, search_year, orig, params definition) ...
        var clean_title = kpCleanTitle(card.title || card.name); // Added card.name fallback
        var search_date = card.release_date || card.first_air_date || card.last_air_date || '0000';
        var search_year = parseInt((search_date + '').slice(0, 4));
        var orig = card.original_title || card.original_name;
        var kp_prox = ''; // Assuming no proxy needed, adjust if necessary
        var params = {
            id: card.id,
            url: kp_prox + 'https://kinopoiskapiunofficial.tech/',
            rating_url: kp_prox + 'https://rating.kinopoisk.ru/',
            headers: {
                'X-API-KEY': '2a4a0808-81a3-40ae-b0d3-e11335ede616' // Hardcoded API Key
            },
            cache_time: 60 * 60 * 24 * 1000 // 1 day cache
        };

        // --- Helper functions need to be present here ---
        function cleanTitle(str){ /* ...as defined before... */
            return str.replace(/[\s.,:;’'`!?]+/g, ' ').trim();
        }
        function kpCleanTitle(str){ /* ...as defined before... */
             if (typeof str !== 'string') return '';
             return cleanTitle(str).replace(/^[ \/\\]+/, '').replace(/[ \/\\]+$/, '').replace(/\+( *[+\/\\])+/g, '+').replace(/([+\/\\] *)+\+/g, '+').replace(/( *[\/\\]+ *)+/g, '+');
        }
        function normalizeTitle(str){ /* ...as defined before... */
             if (typeof str !== 'string') return '';
             return cleanTitle(str.toLowerCase().replace(/[\-\u2010-\u2015\u2E3A\u2E3B\uFE58\uFE63\uFF0D]+/g, '-').replace(/ё/g, 'е'));
        }
        function equalTitle(t1, t2){ /* ...as defined before... */
             return typeof t1 === 'string' && typeof t2 === 'string' && normalizeTitle(t1) === normalizeTitle(t2);
        }
        function containsTitle(str, title){ /* ...as defined before... */
             return typeof str === 'string' && typeof title === 'string' && normalizeTitle(str).indexOf(normalizeTitle(title)) !== -1;
        }
        function showError(error) { /* ...as defined before... */
             console.error("KP/IMDb Rating Error:", error);
             // Lampa.Noty.show('Рейтинг KP: ' + error); // Optional user notification
        }
        function _getCache(movie) { /* ...as defined before... */
            var timestamp = new Date().getTime();
            var cache = Lampa.Storage.cache('kp_rating', 500, {}); // Using original cache key 'kp_rating'
            if (cache[movie]) {
                if ((timestamp - cache[movie].timestamp) > params.cache_time) {
                    delete cache[movie];
                    Lampa.Storage.set('kp_rating', cache);
                    return false;
                }
                // Return a copy
                return Object.assign({}, cache[movie]);
            }
            return false;
        }
        function _setCache(movie, data) { /* ...as defined before... */
            var timestamp = new Date().getTime();
            var cache = Lampa.Storage.cache('kp_rating', 500, {});
            // Ensure timestamp is included in the data being set
            data.timestamp = timestamp;
            cache[movie] = data;
            Lampa.Storage.set('kp_rating', cache);
            return data;
        }
        // --- End Helper Functions ---


        // --- Fetching functions (getRating, searchFilm, chooseFilm) remain the same ---
        function getRating() { /* ... original ... */ }
        function searchFilm() { /* ... original ... */ }
        function chooseFilm(items) { /* ... original, but make sure it calls the MODIFIED _showRating ... */ }
        // --- End Fetching functions ---


        // ### MODIFIED _showRating Function ###
        function _showRating(data) {
            // Find the target container created by the first script
            var targetContainer = $('.new-interface-info__details'); // Use jQuery for simplicity, assuming Lampa context has it

            // If the container doesn't exist (first script's interface isn't active/rendered), do nothing.
            if (!targetContainer.length) {
                // console.log("KP/IMDb: Target container '.new-interface-info__details' not found.");
                return;
            }

            // Check if ratings have already been added by this script to prevent duplicates
            if (targetContainer.find('.kp-imdb-rating-added').length > 0) {
                // console.log("KP/IMDb: Ratings already added to this container.");
                return;
            }

            // Extract ratings
            var kp_rating = data && !isNaN(data.kp) && data.kp !== null ? parseFloat(data.kp).toFixed(1) : null;
            var imdb_rating = data && !isNaN(data.imdb) && data.imdb !== null ? parseFloat(data.imdb).toFixed(1) : null;

            var addedSomething = false;

            // Append IMDb Rating if valid
            if (imdb_rating && parseFloat(imdb_rating) > 0) {
                // Check if separator is needed (if container already has children)
                const separator = targetContainer.children().length > 0 ? '<span class="new-interface-info__split">&#9679;</span>' : '';
                const imdbHtml = separator + '<div class="full-start__rate kp-imdb-rating-added"><div>' + imdb_rating + '</div><div>IMDb</div></div>'; // Added marker class
                targetContainer.append(imdbHtml);
                addedSomething = true;
            }

            // Append KP Rating if valid
            if (kp_rating && parseFloat(kp_rating) > 0) {
                // Check if separator is needed
                const separator = targetContainer.children(':not(.kp-imdb-rating-added)').length > 0 || (addedSomething && !targetContainer.children(':not(.kp-imdb-rating-added)').length) ? '<span class="new-interface-info__split">&#9679;</span>' : '';
                 // The check ensures separator if non-kp/imdb items exist OR if imdb was just added.

                const kpHtml = separator + '<div class="full-start__rate kp-imdb-rating-added"><div>' + kp_rating + '</div><div>KP</div></div>'; // Added marker class
                targetContainer.append(kpHtml);
                addedSomething = true; // Not strictly needed anymore
            }

            // --- Original logic removed ---
            // $('.wait_rating', render).remove(); // Removed, specific to old card
            // $('.rate--imdb', render).removeClass('hide')... // Removed
            // $('.rate--kp', render).removeClass('hide')... // Removed
        }
        // ### End MODIFIED _showRating Function ###

        // Start the fetching process
        getRating();
    }


    // --- Plugin Start Logic ---
    // This remains the same, triggering on the 'full' event
    function startPlugin() {
        // Prevent multiple initializations
        if (window.rating_plugin_kp_imdb_new_target) return;
        window.rating_plugin_kp_imdb_new_target = true;

        Lampa.Listener.follow('full', function (e) {
            // Check if the event type is 'complite' (when the card data is ready)
            if (e.type == 'complite' && e.data && e.data.movie) {
                // Check if the target container exists *before* starting the fetch.
                // This is an optimization to avoid unnecessary API calls if the
                // custom interface isn't even visible.
                if ($('.new-interface-info__details').length > 0) {
                    // Call the main function with the movie data
                    rating_kp_imdb(e.data.movie);
                } else {
                     // console.log("KP/IMDb: '.new-interface-info__details' not found on 'full' event, skipping fetch.");
                }
            }
        });
    }

    // Initialize the plugin
    startPlugin();

})();
