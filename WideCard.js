// == Lampa Homepage Wide Card V13 (Active Search Fallback) ==
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

    // 1. Standard Dictionary Builder
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

    // 2. Network Hooks (Catches the standard TMDB stuff)
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

    // 3. The Layout Transformer Function
    function convertToWide(card, movie, currentSrc) {
        card.addClass('card--wide');
        
        var imgElement = card.find('.card__img');
        var targetImage = movie.backdrop_path ? movie.backdrop_path : movie.poster_path;
        
        if (targetImage) {
            imgElement.attr('src', Lampa.Api.img(targetImage, 'w780'));
            imgElement.css({ 'object-fit': 'cover', 'object-position': 'top' });
        }
        
        var titleText = movie.title || movie.name || card.find('.card__title').text() || "Unknown";
        var synopsis = movie.overview || "No description available.";
        if (synopsis.length > 115) synopsis = synopsis.substring(0, 115) + '...';
        
        card.find('.card__title, .card__age').remove();
        card.find('.card__view').append(
            '<div class="card__promo">' + 
                '<div class="card__promo-title">' + titleText + '</div>' + 
                '<div class="card__promo-text">' + synopsis + '</div>' + 
            '</div>'
        );
    }

    // 4. The Active Search Fallback
    function fetchMissingData(card, title, year, currentSrc, filename) {
        // Mark as searching so we don't spam the API
        card.addClass('is-searching-data'); 
        
        // Use Lampa's native search API to bypass TMDB blocks/proxies
        Lampa.Api.search({ query: title }, function(data) {
            if (data && data.results && data.results.length > 0) {
                var exactMatch = null;
                
                // Try to match the exact release year to prevent wrong movies
                for (var i = 0; i < data.results.length; i++) {
                    var r = data.results[i];
                    var rYear = (r.release_date || r.first_air_date || "").split('-')[0];
                    if (rYear === year) {
                        exactMatch = r;
                        break;
                    }
                }
                
                // Fallback to the first result if the year is slightly off
                if (!exactMatch) exactMatch = data.results[0];

                // Add to dictionary and transform!
                window.lampa_movie_dict[filename] = exactMatch;
                convertToWide(card, exactMatch, currentSrc);
            }
        }, function() {
            // If search fails, just remove the flag so it can try again later
            card.removeClass('is-searching-data'); 
        });
    }

    // 5. The Watcher
    function applyWideDOM() {
        setInterval(function() {
            var activity = window.Lampa && Lampa.Activity ? Lampa.Activity.active() : null;
            if (activity && (activity.component === 'main' || activity.component === 'category')) {
                
                $('.card:not(.card--wide):visible').each(function() {
                    var card = $(this);
                    if (card.hasClass('is-searching-data')) return; // Already searching

                    var imgElement = card.find('.card__img');
                    var currentSrc = imgElement.attr('src') || imgElement.attr('data-src') || "";
                    if (!currentSrc || currentSrc.indexOf('noposter') > -1) return;

                    var filename = getSafeFilename(currentSrc);
                    var movie = window.lampa_movie_dict[filename];
                    
                    // IF WE HAVE DATA: Transform immediately
                    if (movie) {
                        convertToWide(card, movie, currentSrc);
                    } 
                    // IF DATA IS MISSING: Scrape DOM and search TMDB
                    else {
                        var domTitle = card.find('.card__title').text();
                        var domYear = card.find('.card__age').text();
                        if (domTitle && domYear) {
                            fetchMissingData(card, domTitle, domYear, currentSrc, filename);
                        }
                    }
                });
            }
        }, 500); 
    }

    setTimeout(applyWideDOM, 500);
})();
