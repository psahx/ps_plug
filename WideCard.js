// == Lampa Homepage Wide Card DOM Proof V8 ==
(function () {
    'use strict';

    window.lampa_movie_dict = window.lampa_movie_dict || {};

    // 1. Safely extract just the filename (e.g., "image.jpg") to guarantee a match
    function getSafeFilename(path) {
        if (!path) return null;
        return path.split('/').pop(); 
    }

    // 2. Safe Extractor: Digs into the data whether it's an array, object, movie, or TV show
    function extractMoviesSafe(data) {
        if (!data) return;
        
        if (Array.isArray(data)) {
            data.forEach(function(item) {
                extractMoviesSafe(item);
            });
        } else if (typeof data === 'object') {
            // Found a movie/show! Save it to the dictionary.
            if (data.id && (data.poster_path || data.backdrop_path)) {
                var pName = getSafeFilename(data.poster_path);
                var bName = getSafeFilename(data.backdrop_path);
                if (pName) window.lampa_movie_dict[pName] = data;
                if (bName) window.lampa_movie_dict[bName] = data;
            }
            
            // Check all the standard folders Lampa uses for Movies and TV Shows
            if (data.results) extractMoviesSafe(data.results);
            if (data.items) extractMoviesSafe(data.items);
            if (data.movies) extractMoviesSafe(data.movies);
            if (data.card) extractMoviesSafe(data.card);
        }
    }

    // 3. The Ultimate Hook: Catches data from BOTH the Network and Local Cache
    function hookLampaApi() {
        if (!window.Lampa || !Lampa.Api) return false;
        
        ['main', 'list', 'get', 'search'].forEach(function(method) {
            if (Lampa.Api[method] && !Lampa.Api[method]._hooked) {
                var original = Lampa.Api[method];
                Lampa.Api[method] = function(params, onsuccess, onerror) {
                    return original.call(Lampa.Api, params, function(result) {
                        try { extractMoviesSafe(result); } catch (e) {} // Save data instantly
                        if (onsuccess) onsuccess(result);
                    }, onerror);
                };
                Lampa.Api[method]._hooked = true;
            }
        });
        return true;
    }

    // 4. The DOM Watcher
    function proveWideDOM_V8() {
        setInterval(function() {
            var activity = window.Lampa && Lampa.Activity ? Lampa.Activity.active() : null;
            
            // Apply to Home page ('main') and category pages
            if (activity && (activity.component === 'main' || activity.component === 'category')) {
                
                $('.card:not(.card--wide):visible').each(function() {
                    var card = $(this);
                    
                    var imgElement = card.find('.card__img');
                    var currentSrc = imgElement.attr('src') || imgElement.attr('data-src') || "";
                    if (!currentSrc) return;

                    // Match the card's image to our dictionary
                    var filename = getSafeFilename(currentSrc);
                    var movie = window.lampa_movie_dict[filename];
                    
                    if (!movie) return; // If data isn't loaded yet, skip for now

                    // Make it physically wide
                    card.addClass('card--wide');
                    
                    // Upgrade Image: Horizontal backdrop, aligned to top
                    var hdImage = movie.backdrop_path ? movie.backdrop_path : movie.poster_path;
                    if (hdImage) {
                        imgElement.attr('src', Lampa.Api.img(hdImage, 'w780'));
                        imgElement.css({
                            'object-fit': 'cover',
                            'object-position': 'top'
                        });
                    }
                    
                    // Truncate synopsis to 115 chars
                    var titleText = movie.title || movie.name || "Unknown";
                    var synopsis = movie.overview || "No description available.";
                    if (synopsis.length > 115) {
                        synopsis = synopsis.substring(0, 115) + '...';
                    }
                    
                    // Clean old text
                    card.find('.card__title, .card__age').remove();
                    
                    // Inject exact wide template
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

    // Rapid-fire boot sequence to catch Lampa before it draws the screen
    var bootInterval = setInterval(function() {
        if (hookLampaApi()) {
            clearInterval(bootInterval);
            proveWideDOM_V8(); // Start watcher immediately
        }
    }, 50);

})();
