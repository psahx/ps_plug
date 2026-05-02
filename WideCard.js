// == Lampa Homepage Wide Card V12 (The Memory Scraper) ==
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

    // 1. NEW: Scrape Lampa's Offline Local Databases (History, Bookmarks, Watched)
    function scrapeOfflineMemory() {
        if (!window.Lampa || !Lampa.Storage) return;
        var localDBs = ['history', 'wath', 'favorite', 'like', 'book', 'look'];
        localDBs.forEach(function(db) {
            try {
                var data = Lampa.Storage.get(db);
                if (data) extractMoviesSafe(data);
            } catch (e) {}
        });
    }

    // 2. Hook API for Instant Cache Loads
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

    // 3. Hook Network for Lazy Loads
    function hookLampaNetwork() {
        if (window.Lampa && Lampa.Reguest && !Lampa.Reguest._hooked) {
            var orig_silent = Lampa.Reguest.prototype.silent;
            Lampa.Reguest.prototype.silent = function(url, onsuccess, onerror) {
                var new_onsuccess = function(data) {
                    try { extractMoviesSafe(data); } catch (e) {}
                    if (onsuccess) onsuccess(data);
                };
                return orig_silent.call(this, url, new_onsuccess, onerror);
            };

            var orig_request = Lampa.Reguest.prototype.request;
            Lampa.Reguest.prototype.request = function(url, onsuccess, onerror) {
                var new_onsuccess = function(data) {
                    try { extractMoviesSafe(data); } catch (e) {}
                    if (onsuccess) onsuccess(data);
                };
                return orig_request.call(this, url, new_onsuccess, onerror);
            };
            Lampa.Reguest._hooked = true;
        }
    }

    // 4. The Layout Transformer
    function applyWideDOM() {
        setInterval(function() {
            var activity = window.Lampa && Lampa.Activity ? Lampa.Activity.active() : null;
            if (activity && (activity.component === 'main' || activity.component === 'category')) {
                
                $('.card:not(.card--wide):visible').each(function() {
                    var card = $(this);
                    
                    var imgElement = card.find('.card__img');
                    var currentSrc = imgElement.attr('src') || imgElement.attr('data-src') || "";
                    if (!currentSrc || currentSrc.indexOf('noposter') > -1) return;

                    var filename = getSafeFilename(currentSrc);
                    var movie = window.lampa_movie_dict[filename];
                    
                    if (!movie) return; // Still waiting for data match

                    card.addClass('card--wide');
                    
                    var targetImage = movie.backdrop_path ? movie.backdrop_path : movie.poster_path;
                    if (targetImage) {
                        imgElement.attr('src', Lampa.Api.img(targetImage, 'w780'));
                        imgElement.css({ 'object-fit': 'cover', 'object-position': 'top' });
                    }
                    
                    var titleText = movie.title || movie.name || card.find('.card__title').text() || "Unknown";
                    var synopsis = movie.overview || "No description available.";
                    if (synopsis.length > 115) synopsis = synopsis.substring(0, 115) + '...';
                    
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

    // Boot Sequence
    var bootInterval = setInterval(function() {
        if (hookLampaApi()) {
            scrapeOfflineMemory(); // Pull offline data instantly
            hookLampaNetwork();    // Watch the network
            clearInterval(bootInterval);
        }
    }, 50);

    setTimeout(applyWideDOM, 500);
})();
