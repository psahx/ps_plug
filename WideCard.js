// == Lampa Homepage Wide Card DOM Proof V9 ==
(function () {
    'use strict';

    window.lampa_movie_dict = window.lampa_movie_dict || {};

    // 1. The scrubbed filename matcher (Strips out ?v=123 tags)
    function getSafeFilename(path) {
        if (!path) return null;
        var file = path.split('/').pop(); // Get the last part
        file = file.split('?')[0].split('#')[0]; // Strip any extra URL parameters
        // Only return if it's an actual image file, ignore local placeholders
        if (file && (file.indexOf('.jpg') > -1 || file.indexOf('.png') > -1)) {
            return file;
        }
        return null;
    }

    function extractMoviesSafe(data) {
        if (!data) return;
        
        if (Array.isArray(data)) {
            data.forEach(function(item) {
                extractMoviesSafe(item);
            });
        } else if (typeof data === 'object') {
            if (data.id && (data.poster_path || data.backdrop_path)) {
                var pName = getSafeFilename(data.poster_path);
                var bName = getSafeFilename(data.backdrop_path);
                if (pName) window.lampa_movie_dict[pName] = data;
                if (bName) window.lampa_movie_dict[bName] = data;
            }
            
            if (data.results) extractMoviesSafe(data.results);
            if (data.items) extractMoviesSafe(data.items);
            if (data.movies) extractMoviesSafe(data.movies);
            if (data.card) extractMoviesSafe(data.card);
        }
    }

    // 2. Hook immediately to catch instant-cache loads
    function hookLampaApi() {
        if (!window.Lampa || !Lampa.Api) return false;
        
        ['main', 'list', 'get', 'search'].forEach(function(method) {
            if (Lampa.Api[method] && !Lampa.Api[method]._hooked) {
                var original = Lampa.Api[method];
                Lampa.Api[method] = function(params, onsuccess, onerror) {
                    return original.call(Lampa.Api, params, function(result) {
                        try { extractMoviesSafe(result); } catch (e) {}
                        if (onsuccess) onsuccess(result);
                    }, onerror);
                };
                Lampa.Api[method]._hooked = true;
            }
        });
        return true;
    }
    
    // Try to hook immediately on script load
    hookLampaApi();

    function proveWideDOM_V9() {
        setInterval(function() {
            var activity = window.Lampa && Lampa.Activity ? Lampa.Activity.active() : null;
            
            if (activity && (activity.component === 'main' || activity.component === 'category')) {
                
                $('.card:not(.card--wide):visible').each(function() {
                    var card = $(this);
                    
                    var imgElement = card.find('.card__img');
                    var currentSrc = imgElement.attr('src') || imgElement.attr('data-src') || "";
                    if (!currentSrc) return;

                    var filename = getSafeFilename(currentSrc);
                    var movie = window.lampa_movie_dict[filename];
                    
                    if (!movie) return;

                    // Make it physically wide
                    card.addClass('card--wide');
                    
                    // Prioritize horizontal backdrop, fallback to vertical poster if TMDB doesn't have one
                    var targetImage = movie.backdrop_path ? movie.backdrop_path : movie.poster_path;
                    if (targetImage) {
                        imgElement.attr('src', Lampa.Api.img(targetImage, 'w780'));
                        imgElement.css({
                            'object-fit': 'cover',
                            'object-position': 'top'
                        });
                    }
                    
                    var titleText = movie.title || movie.name || "Unknown";
                    var synopsis = movie.overview || "No description available.";
                    if (synopsis.length > 115) {
                        synopsis = synopsis.substring(0, 115) + '...';
                    }
                    
                    card.find('.card__title, .card__age').remove();
                    
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

    // Keep trying to hook just in case Lampa loaded slower than the script
    var bootInterval = setInterval(function() {
        if (hookLampaApi()) {
            clearInterval(bootInterval);
        }
    }, 50);

    setTimeout(proveWideDOM_V9, 500);
})();
