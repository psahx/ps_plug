// == Lampa Homepage Wide Card DOM Proof V6 ==
(function () {
    'use strict';

    // 1. Create a bulletproof dictionary
    window.lampa_movie_dict = window.lampa_movie_dict || {};

    function extractMovies(items) {
        if (!items) return;
        
        // Handle both arrays and wrapped result objects
        if (Array.isArray(items)) {
            items.forEach(function(item) {
                if (item && typeof item === 'object') {
                    // Map BOTH image types so we never miss a lookup
                    if (item.poster_path) window.lampa_movie_dict[item.poster_path] = item;
                    if (item.backdrop_path) window.lampa_movie_dict[item.backdrop_path] = item;
                    
                    // Dig deeper if there are nested results
                    if (item.results) extractMovies(item.results);
                    if (item.items) extractMovies(item.items); 
                }
            });
        } else if (items.results) {
            extractMovies(items.results);
        } else if (items.items) {
            extractMovies(items.items);
        }
    }

    // 2. The Master Network Hook: Catch everything, including lazy-loaded rows
    if (window.Lampa && Lampa.Reguest) {
        if (!window.lampa_network_hooked) {
            var orig_silent = Lampa.Reguest.prototype.silent;
            Lampa.Reguest.prototype.silent = function(url, onsuccess, onerror) {
                var new_onsuccess = function(data) {
                    try { if (data) extractMovies(data); } catch (e) {}
                    if (onsuccess) onsuccess(data);
                };
                return orig_silent.call(this, url, new_onsuccess, onerror);
            };

            var orig_request = Lampa.Reguest.prototype.request;
            Lampa.Reguest.prototype.request = function(url, onsuccess, onerror) {
                var new_onsuccess = function(data) {
                    try { if (data) extractMovies(data); } catch (e) {}
                    if (onsuccess) onsuccess(data);
                };
                return orig_request.call(this, url, new_onsuccess, onerror);
            };
            window.lampa_network_hooked = true;
        }
    }

    function proveWideDOM_V6() {
        setInterval(function() {
            var activity = window.Lampa && Lampa.Activity ? Lampa.Activity.active() : null;
            
            if (activity && activity.component === 'main') {
                
                $('.card:not(.card--wide):visible').each(function() {
                    var card = $(this);
                    
                    var imgElement = card.find('.card__img');
                    // Check 'data-src' just in case Lampa is lazy-loading the image
                    var currentSrc = imgElement.attr('src') || imgElement.attr('data-src') || "";
                    if (!currentSrc) return;

                    var pathParts = currentSrc.split('/');
                    var filename = '/' + pathParts[pathParts.length - 1]; 
                    
                    var movie = window.lampa_movie_dict[filename];
                    if (!movie) return; // Wait for the data to arrive

                    // 3. Make it physically wide
                    card.addClass('card--wide');
                    
                    // 4. Fix Image: Use horizontal backdrop and align to the top
                    var hdImage = movie.backdrop_path ? movie.backdrop_path : movie.poster_path;
                    if (hdImage) {
                        imgElement.attr('src', Lampa.Api.img(hdImage, 'w780'));
                        imgElement.css({
                            'object-fit': 'cover',
                            'object-position': 'top'
                        });
                    }
                    
                    // 5. Truncate text cleanly
                    var titleText = movie.title || movie.name || "Unknown";
                    var synopsis = movie.overview || "No description available.";
                    if (synopsis.length > 115) {
                        synopsis = synopsis.substring(0, 115) + '...';
                    }
                    
                    card.find('.card__title, .card__age').remove();
                    
                    // 6. Inject the exact native layout
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

    setTimeout(proveWideDOM_V6, 500);
})();
