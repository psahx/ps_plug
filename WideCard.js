// == Lampa Hover Trigger Proof V11 ==
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

    // Catch the instant cache for the first 6 rows
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

    // The Master Layout Changer
    function applyWideStyle(card) {
        if (card.hasClass('card--wide')) return;
        
        var imgElement = card.find('.card__img');
        var currentSrc = imgElement.attr('src') || imgElement.attr('data-src') || "";
        if (!currentSrc) return;

        var filename = getSafeFilename(currentSrc);
        var movie = window.lampa_movie_dict[filename];

        // Make it physically wide
        card.addClass('card--wide');
        
        var titleText = card.find('.card__title').text() || "Unknown";
        var synopsis = ""; 

        // Scenario A: We have the real data from the dictionary
        if (movie) {
            titleText = movie.title || movie.name || titleText;
            synopsis = movie.overview || "";
            if (synopsis.length > 115) synopsis = synopsis.substring(0, 115) + '...';
            
            var targetImage = movie.backdrop_path ? movie.backdrop_path : movie.poster_path;
            if (targetImage) {
                imgElement.attr('src', Lampa.Api.img(targetImage, 'w780'));
                imgElement.css({'object-fit': 'cover', 'object-position': 'top'});
            }
        } 
        // Scenario B: Missing data fallback (Upgrades DOM, leaves text blank)
        else {
            var hdSrc = currentSrc.replace('/w500/', '/w780/').replace('/w342/', '/w780/');
            imgElement.attr('src', hdSrc);
            imgElement.css({'object-fit': 'cover', 'object-position': 'center'});
        }

        card.find('.card__title, .card__age').remove();
        
        var promoHtml = $(
            '<div class="card__promo">' + 
                '<div class="card__promo-title">' + titleText + '</div>' + 
                '<div class="card__promo-text">' + synopsis + '</div>' + 
            '</div>'
        );
        
        card.find('.card__view').append(promoHtml);
    }

    // 1. Initial automated sweep (Only applies if data is perfectly matched)
    setInterval(function() {
        var activity = window.Lampa && Lampa.Activity ? Lampa.Activity.active() : null;
        if (activity && (activity.component === 'main' || activity.component === 'category')) {
            $('.card:not(.card--wide):visible').each(function() {
                var card = $(this);
                var filename = getSafeFilename(card.find('.card__img').attr('src'));
                // Auto-convert ONLY the first rows that we have guaranteed data for
                if (window.lampa_movie_dict[filename]) {
                    applyWideStyle(card);
                }
            });
        }
    }, 500);

    // 2. The User's Hover Trigger (Catches everything else)
    $(document).on('mouseenter focus hover:focus', '.card:not(.card--wide)', function() {
        var activity = window.Lampa && Lampa.Activity ? Lampa.Activity.active() : null;
        if (activity && (activity.component === 'main' || activity.component === 'category')) {
            applyWideStyle($(this));
        }
    });

})();
