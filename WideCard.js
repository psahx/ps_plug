// == Lampa Missing Data Bounty Hunter ==
(function () {
    'use strict';

    window.lampa_movie_dict = window.lampa_movie_dict || {};

    function getSafeFilename(path) {
        if (!path) return null;
        var file = path.split('/').pop();
        file = file.split('?')[0].split('#')[0]; 
        if (file && (file.indexOf('.jpg') > -1 || file.indexOf('.png') > -1)) return file;
        return null;
    }

    function extractMoviesSafe(data) {
        if (!data) return;
        if (Array.isArray(data)) {
            data.forEach(function(item) { extractMoviesSafe(item); });
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

    // Hook the instant cache load
    if (window.Lampa && Lampa.Api) {
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
    }

    // The Ghost Hunter Watcher
    setInterval(function() {
        var activity = window.Lampa && Lampa.Activity ? Lampa.Activity.active() : null;
        if (activity && (activity.component === 'main' || activity.component === 'category')) {
            
            // Look at every single standard card
            $('.card:not(.card--wide):visible').each(function() {
                var card = $(this);
                
                // If we already marked it as a ghost, skip it
                if (card.hasClass('ghost-marked')) return;

                var imgElement = card.find('.card__img');
                var currentSrc = imgElement.attr('src') || imgElement.attr('data-src') || "";
                
                // If it hasn't loaded an image yet, skip for now
                if (!currentSrc || currentSrc.indexOf('noposter') > -1) return;

                var filename = getSafeFilename(currentSrc);
                var movie = window.lampa_movie_dict[filename];

                // If the dictionary DOES NOT have this movie... we caught a ghost!
                if (!movie) {
                    card.addClass('ghost-marked');
                    card.css('border', '3px solid red'); // Visually mark it on screen
                    
                    console.log("👻 GHOST CARD CAUGHT!");
                    console.log("Failed Image URL:", currentSrc);
                    console.log("Raw HTML:", card[0].outerHTML);
                }
            });
        }
    }, 1000); 

})();
