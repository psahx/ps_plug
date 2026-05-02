// == Lampa Homepage Wide Card DOM Proof V7 ==
(function () {
    'use strict';

    // 1. Create our master dictionary
    window.lampa_movie_dict = window.lampa_movie_dict || {};

    // 2. The Deep Scanner: Recursively searches the entire API response for movies/shows
    function extractMoviesDeep(obj) {
        if (!obj || typeof obj !== 'object') return;

        // If this specific object has an ID and an image, it's a movie/show. Save it!
        if (obj.id && (obj.poster_path || obj.backdrop_path)) {
            if (obj.poster_path) {
                var pPath = obj.poster_path.split('/').pop(); // Get exact filename
                window.lampa_movie_dict[pPath] = obj;
            }
            if (obj.backdrop_path) {
                var bPath = obj.backdrop_path.split('/').pop();
                window.lampa_movie_dict[bPath] = obj;
            }
        }

        // Keep digging deeper into the data structure
        Object.values(obj).forEach(function(val) {
            if (val && typeof val === 'object') {
                extractMoviesDeep(val);
            }
        });
    }

    // 3. The Network Hook: Catch every single TMDB request Lampa makes
    if (window.Lampa && Lampa.Reguest && !window.lampa_network_hooked_v7) {
        var orig_silent = Lampa.Reguest.prototype.silent;
        Lampa.Reguest.prototype.silent = function(url, onsuccess, onerror) {
            var new_onsuccess = function(data) {
                try { extractMoviesDeep(data); } catch (e) {}
                if (onsuccess) onsuccess(data);
            };
            return orig_silent.call(this, url, new_onsuccess, onerror);
        };

        var orig_request = Lampa.Reguest.prototype.request;
        Lampa.Reguest.prototype.request = function(url, onsuccess, onerror) {
            var new_onsuccess = function(data) {
                try { extractMoviesDeep(data); } catch (e) {}
                if (onsuccess) onsuccess(data);
            };
            return orig_request.call(this, url, new_onsuccess, onerror);
        };
        window.lampa_network_hooked_v7 = true;
    }

    // 4. The DOM Watcher
    function proveWideDOM_V7() {
        setInterval(function() {
            var activity = window.Lampa && Lampa.Activity ? Lampa.Activity.active() : null;
            
            if (activity && activity.component === 'main') {
                
                $('.card:not(.card--wide):visible').each(function() {
                    var card = $(this);
                    
                    var imgElement = card.find('.card__img');
                    var currentSrc = imgElement.attr('src') || imgElement.attr('data-src') || "";
                    if (!currentSrc) return;

                    // Extract the raw filename to match the Deep Scanner
                    var filename = currentSrc.split('/').pop(); 
                    
                    var movie = window.lampa_movie_dict[filename];
                    if (!movie) return; // Wait for the data to arrive

                    // Make it physically wide
                    card.addClass('card--wide');
                    
                    // Fix Image: Use horizontal backdrop and align to the top
                    var hdImage = movie.backdrop_path ? movie.backdrop_path : movie.poster_path;
                    if (hdImage) {
                        imgElement.attr('src', Lampa.Api.img(hdImage, 'w780'));
                        imgElement.css({
                            'object-fit': 'cover',
                            'object-position': 'top'
                        });
                    }
                    
                    // Truncate text cleanly (115 characters max)
                    var titleText = movie.title || movie.name || "Unknown";
                    var synopsis = movie.overview || "No description available.";
                    if (synopsis.length > 115) {
                        synopsis = synopsis.substring(0, 115) + '...';
                    }
                    
                    // Remove Lampa's outside text elements
                    card.find('.card__title, .card__age').remove();
                    
                    // Inject the exact native layout
                    var promoHtml = $(
                        '<div class="card__promo">' + 
                            '<div class="card__promo-title">' + titleText + '</div>' + 
                            '<div class="card__promo-text">' + synopsis + '</div>' + 
                        '</div>'
                    );
                    
                    card.find('.card__view').append(promoHtml);
                });
            }
        }, 500); 
    }

    setTimeout(proveWideDOM_V7, 500);
})();
