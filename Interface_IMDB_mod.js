(function () {
    'use strict';

    // Helper functions from the rating plugin (moved inside the IIFE)
    function cleanTitle(str) {
        return str.replace(/[\s.,:;’'`!?]+/g, ' ').trim();
    }

    function kpCleanTitle(str) {
        // Keep the specific cleaning logic for Kinopoisk search
        return cleanTitle(str).replace(/^[ \/\\]+/, '').replace(/[ \/\\]+$/, '').replace(/\+( *[+\/\\])+/g, '+').replace(/([+\/\\] *)+\+/g, '+').replace(/( *[\/\\]+ *)+/g, '+');
    }

    function normalizeTitle(str) {
        if (typeof str !== 'string') return '';
        return cleanTitle(str.toLowerCase().replace(/[\-\u2010-\u2015\u2E3A\u2E3B\uFE58\uFE63\uFF0D]+/g, '-').replace(/ё/g, 'е'));
    }

    function equalTitle(t1, t2) {
        return typeof t1 === 'string' && typeof t2 === 'string' && normalizeTitle(t1) === normalizeTitle(t2);
    }

    function containsTitle(str, title) {
        return typeof str === 'string' && typeof title === 'string' && normalizeTitle(str).indexOf(normalizeTitle(title)) !== -1;
    }

    // Cache functions from the rating plugin (scoped within the IIFE)
    // Added cache_time parameter for flexibility if needed later
    function _getCache(movie_id, cache_time) {
        var timestamp = new Date().getTime();
        var cache = Lampa.Storage.cache('kp_imdb_rating', 500, {}); // Using a new cache key 'kp_imdb_rating'
        if (cache[movie_id]) {
            if ((timestamp - cache[movie_id].timestamp) > cache_time) {
                // If cache expired, clear it for this movie
                delete cache[movie_id];
                Lampa.Storage.set('kp_imdb_rating', cache);
                return false;
            }
            // Return cached data if valid
            return cache[movie_id];
        }
        return false;
    }

    function _setCache(movie_id, data, cache_time) {
        var timestamp = new Date().getTime();
        var cache = Lampa.Storage.cache('kp_imdb_rating', 500, {}); // Using a new cache key 'kp_imdb_rating'
        data.timestamp = timestamp; // Add timestamp to the data being cached
        cache[movie_id] = data;
        Lampa.Storage.set('kp_imdb_rating', cache);
        return data;
    }


    function create() {
        var html;
        var timer;
        var network = new Lampa.Reguest(); // Network for TMDB details
        var rating_network = new Lampa.Reguest(); // Separate network for KP/IMDB ratings
        var loaded = {};
        var kp_imdb_loaded = {}; // To prevent multiple calls for the same item

        // Moved rating parameters here for clarity
        var rating_params = {
            kp_prox: '', // Define proxy if needed
            api_url: 'https://kinopoiskapiunofficial.tech/',
            rating_url: 'https://rating.kinopoisk.ru/',
            api_key: '2a4a0808-81a3-40ae-b0d3-e11335ede616', // Use your actual key
            cache_time: 60 * 60 * 24 * 1000 // 24 hours cache
        };

        this.create = function () {
            html = $("<div class=\"new-interface-info\">\n            <div class=\"new-interface-info__body\">\n                <div class=\"new-interface-info__head\"></div>\n                <div class=\"new-interface-info__title\"></div>\n                <div class=\"new-interface-info__details\"></div>\n                <div class=\"new-interface-info__description\"></div>\n            </div>\n        </div>");
            // Add placeholders for ratings in the details section immediately
            // This ensures they exist even before data is loaded
            html.find('.new-interface-info__details').append(
                '<div class="full-start__rate rate--kp lampa-hide"><div>-</div><div>KP</div></div>' +
                '<div class="full-start__rate rate--imdb lampa-hide"><div>-</div><div>IMDb</div></div>'
            );
        };

        this.update = function (data) {
            html.find('.new-interface-info__head,.new-interface-info__details .full-start__rate:not(.rate--kp):not(.rate--imdb)').remove(); // Clear previous details except KP/IMDB placeholders
             html.find('.new-interface-info__details .rate--kp, .new-interface-info__details .rate--imdb').addClass('lampa-hide').find('> div').eq(0).text('-'); // Reset KP/IMDB placeholders

            html.find('.new-interface-info__title').text(data.title);
            html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));
            Lampa.Background.change(Lampa.Api.img(data.backdrop_path, 'w200'));
            kp_imdb_loaded[data.id] = false; // Reset loaded flag for external ratings
            this.load(data);
        };

        this.draw = function (data) {
            var create_year = ((data.release_date || data.first_air_date || '0000') + '').slice(0, 4);
            var vote = parseFloat((data.vote_average || 0) + '').toFixed(1);
            var head = [];
            var details_html = ''; // Build as HTML string directly
            var countries = Lampa.Api.sources.tmdb.parseCountries(data);
            var pg = Lampa.Api.sources.tmdb.parsePG(data);

            // Build Head
            if (create_year !== '0000') head.push('<span>' + create_year + '</span>');
            if (countries.length > 0) head.push(countries.join(', '));
            html.find('.new-interface-info__head').empty().append(head.join(', '));

            // Build Details (TMDB rating first)
            if (vote > 0) {
                 details_html += '<div class="full-start__rate"><div>' + vote + '</div><div>TMDB</div></div>';
            }

            // Append KP and IMDb placeholders (already added in create, just ensure they follow TMDB)
            details_html += html.find('.new-interface-info__details .rate--kp')[0].outerHTML;
            details_html += html.find('.new-interface-info__details .rate--imdb')[0].outerHTML;


            // Other details (Genres, Runtime, PG)
            var other_details = [];
             if (data.genres && data.genres.length > 0) other_details.push(data.genres.map(function (item) {
                return Lampa.Utils.capitalizeFirstLetter(item.name);
            }).join(' | '));
            if (data.runtime) other_details.push(Lampa.Utils.secondsToTime(data.runtime * 60, true));
            if (pg) other_details.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + '</span>');

            if (other_details.length > 0) {
                 // Add separator if TMDB rating or KP/IMDB placeholders were added
                if (vote > 0 || html.find('.new-interface-info__details .rate--kp, .new-interface-info__details .rate--imdb').length > 0) {
                   details_html += '<span class="new-interface-info__split">&#9679;</span>';
                }
                details_html += other_details.join('<span class="new-interface-info__split">&#9679;</span>');
            }

            // Update the details container
            html.find('.new-interface-info__details').html(details_html);


            // --- Trigger KP/IMDB Rating Fetch ---
            // Pass the detailed 'data' object received by draw
            this.fetchExternalRatings(data);
            // -----------------------------------
        };

        this.load = function (data) {
            var _this = this;
            clearTimeout(timer);
            var url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));

            if (loaded[url]) {
                // If detailed TMDB data is cached, draw immediately
                _this.draw(loaded[url]);
                return;
            }

            timer = setTimeout(function () {
                network.clear();
                network.timeout(5000);
                network.silent(url, function (movie) {
                    loaded[url] = movie;
                    _this.draw(movie); // Draw TMDB details
                }, function() {
                    // Handle TMDB fetch error if needed
                    html.find('.new-interface-info__details .rate--kp, .new-interface-info__details .rate--imdb').addClass('lampa-hide'); // Hide KP/IMDB if TMDB fails
                });
            }, 150); // Reduced delay slightly
        };

        // --- New Method to Fetch and Display KP/IMDB Ratings ---
        this.fetchExternalRatings = function(card_data) {
            if (!card_data || !card_data.id || kp_imdb_loaded[card_data.id]) {
                // Avoid fetching if no data, no ID, or already loaded for this view instance
                return;
            }

            var movie_id = card_data.id; // Use TMDB ID as the key
            var _this = this; // Reference to the 'create' instance

            // Check cache first
            var cached_ratings = _getCache(movie_id, rating_params.cache_time);
            if (cached_ratings) {
                _showExternalRatings(cached_ratings); // Display cached ratings
                kp_imdb_loaded[movie_id] = true; // Mark as loaded for this instance
                return;
            }

            // Prepare search parameters
            var clean_title_search = kpCleanTitle(card_data.title || card_data.name); // Use name for TV shows
            var search_date = card_data.release_date || card_data.first_air_date || card_data.last_air_date || '0000';
            var search_year = parseInt((search_date + '').slice(0, 4));
            var orig_title = card_data.original_title || card_data.original_name;
            var imdb_id_search = card_data.imdb_id;

            // Mark as loading started to prevent duplicates
            kp_imdb_loaded[movie_id] = true;
             // Optionally show a loading indicator in placeholders
            html.find('.new-interface-info__details .rate--kp > div:first-child, .new-interface-info__details .rate--imdb > div:first-child').html('<div class="broadcast__scan" style="width: 1em; height: 1em;"><div></div></div>');
            html.find('.new-interface-info__details .rate--kp, .new-interface-info__details .rate--imdb').removeClass('lampa-hide');


            // --- Kinopoisk Search Logic (adapted from rating plugin) ---
            var url = rating_params.api_url;
            var url_by_title = Lampa.Utils.addUrlComponent(url + 'api/v2.1/films/search-by-keyword', 'keyword=' + encodeURIComponent(clean_title_search));
            var search_url = imdb_id_search ? Lampa.Utils.addUrlComponent(url + 'api/v2.2/films', 'imdbId=' + encodeURIComponent(imdb_id_search)) : url_by_title;

            rating_network.clear();
            rating_network.timeout(15000);
            rating_network.silent(search_url, function (json) {
                var items = json.items || json.films || [];
                if (items.length === 0 && search_url !== url_by_title) {
                    // If search by IMDB ID failed, try by title
                    rating_network.clear();
                    rating_network.timeout(15000);
                    rating_network.silent(url_by_title, function (json_title) {
                        chooseFilm(json_title.items || json_title.films || []);
                    }, function (a, c) {
                        handleFetchError(rating_network.errorDecode(a, c));
                    }, false, { headers: { 'X-API-KEY': rating_params.api_key } });
                } else {
                    chooseFilm(items);
                }
            }, function (a, c) {
                // If initial search fails (maybe title search directly)
                 if (search_url !== url_by_title) { // If it wasn't already title search
                     rating_network.clear();
                     rating_network.timeout(15000);
                     rating_network.silent(url_by_title, function (json_title) {
                         chooseFilm(json_title.items || json_title.films || []);
                     }, function (a_t, c_t) {
                         handleFetchError(rating_network.errorDecode(a_t, c_t));
                     }, false, { headers: { 'X-API-KEY': rating_params.api_key } });
                 } else {
                     handleFetchError(rating_network.errorDecode(a, c));
                 }
            }, false, { headers: { 'X-API-KEY': rating_params.api_key } });
            // --- End Kinopoisk Search Logic ---


            function chooseFilm(items) {
                 if (!items || items.length === 0) {
                     return handleNoResults();
                 }

                 items.forEach(function (c) {
                    var year = c.start_date || c.year || '0000';
                    c.tmp_year = parseInt((year + '').slice(0, 4));
                });

                var filtered = items;
                var is_sure = false;
                var matched_by_imdb = false;

                // 1. Filter by IMDB ID if available (strongest match)
                if (imdb_id_search) {
                    var imdb_match = filtered.filter(function (elem) {
                        return (elem.imdb_id || elem.imdbId) == imdb_id_search;
                    });
                    if (imdb_match.length) {
                        filtered = imdb_match;
                        is_sure = true;
                        matched_by_imdb = true;
                    }
                }

                // 2. Filter by Original Title (if not already matched by IMDB)
                if (filtered.length > 1 && orig_title) {
                    var orig_match = filtered.filter(function (elem) {
                         return containsTitle(elem.orig_title || elem.nameOriginal, orig_title) ||
                                containsTitle(elem.en_title || elem.nameEn, orig_title) ||
                                containsTitle(elem.title || elem.ru_title || elem.nameRu, orig_title);
                    });
                    if (orig_match.length) {
                        filtered = orig_match;
                        is_sure = true;
                    }
                }

                // 3. Filter by Main Title (if still multiple matches)
                if (filtered.length > 1 && card_data.title) { // using card_data.title here
                     var title_match = filtered.filter(function (elem) {
                         return containsTitle(elem.title || elem.ru_title || elem.nameRu, card_data.title) ||
                                containsTitle(elem.en_title || elem.nameEn, card_data.title) ||
                                containsTitle(elem.orig_title || elem.nameOriginal, card_data.title);
                     });
                     if (title_match.length) {
                         filtered = title_match;
                         is_sure = true;
                     }
                }

                // 4. Filter by Year Proximity (if still multiple matches)
                 if (filtered.length > 1 && search_year) {
                    var year_match = filtered.filter(function (c) {
                        return c.tmp_year === search_year;
                    });
                    // Allow +/- 1 year difference if exact match fails
                    if (!year_match.length) {
                        year_match = filtered.filter(function (c) {
                            return c.tmp_year && Math.abs(c.tmp_year - search_year) <= 1;
                        });
                    }
                     if (year_match.length) {
                         filtered = year_match;
                         // Keep is_sure true if filtered by year
                     }
                 }


                 // Refine 'is_sure' check for single results not matched by IMDB
                if (filtered.length === 1 && !matched_by_imdb) {
                    var candidate = filtered[0];
                    var title_match_strict = false;
                    var year_match_strict = false;

                    // Check for exact year match or proximity
                    if (search_year && candidate.tmp_year) {
                        year_match_strict = Math.abs(candidate.tmp_year - search_year) <= 1;
                    } else if (!search_year && !candidate.tmp_year) {
                        year_match_strict = true; // Both years unknown, consider it a match
                    } else {
                         year_match_strict = true; // Only one year known, weaker match but proceed
                    }

                    // Check for reasonably close title match
                    if (orig_title) {
                        title_match_strict = equalTitle(candidate.orig_title || candidate.nameOriginal, orig_title) ||
                                             equalTitle(candidate.en_title || candidate.nameEn, orig_title);
                    }
                    if (!title_match_strict && card_data.title) {
                         title_match_strict = equalTitle(candidate.title || candidate.ru_title || candidate.nameRu, card_data.title) ||
                                              equalTitle(candidate.en_title || candidate.nameEn, card_data.title);
                    }
                     // Fallback to contains check if equal fails but titles exist
                     if (!title_match_strict && (orig_title || card_data.title)) {
                          title_match_strict = containsTitle(candidate.orig_title || candidate.nameOriginal, orig_title) ||
                                               containsTitle(candidate.en_title || candidate.nameEn, orig_title) ||
                                               containsTitle(candidate.title || candidate.ru_title || candidate.nameRu, card_data.title) ||
                                               containsTitle(candidate.en_title || candidate.nameEn, card_data.title);
                     }


                    is_sure = year_match_strict && title_match_strict;
                }

                 // Proceed if exactly one likely match is found
                if (filtered.length === 1 && is_sure) {
                    var kp_id = filtered[0].kp_id || filtered[0].kinopoisk_id || filtered[0].kinopoiskId || filtered[0].filmId;
                    if (kp_id) {
                         fetchRatingsById(kp_id);
                    } else {
                         handleNoResults(); // Found item but no KP ID
                    }
                } else {
                    handleNoResults(); // No single confident match
                }
            }


            function fetchRatingsById(kp_id) {
                // Try fetching from the faster XML endpoint first
                rating_network.clear();
                rating_network.timeout(5000);
                rating_network["native"](rating_params.rating_url + kp_id + '.xml', function (str) {
                    var found_in_xml = false;
                    if (str && str.indexOf('<rating>') >= 0) {
                        try {
                            var ratingKinopoisk = 0;
                            var ratingImdb = 0;
                            var xml = $($.parseXML(str));
                            var kp_rating_node = xml.find('kp_rating');
                            if (kp_rating_node.length) {
                                ratingKinopoisk = parseFloat(kp_rating_node.text()) || 0;
                            }
                            var imdb_rating_node = xml.find('imdb_rating');
                            if (imdb_rating_node.length) {
                                ratingImdb = parseFloat(imdb_rating_node.text()) || 0;
                            }

                            if (ratingKinopoisk > 0 || ratingImdb > 0) {
                                var movieRating = _setCache(movie_id, { kp: ratingKinopoisk, imdb: ratingImdb }, rating_params.cache_time);
                                _showExternalRatings(movieRating);
                                found_in_xml = true;
                            }
                        } catch (ex) {
                           // XML parsing error, ignore and fall back to API
                           console.error("Lampa Ratings: XML Parse Error", ex);
                        }
                    }
                    // Fallback to main API if XML failed or ratings were zero
                    if (!found_in_xml) {
                        fetchRatingsFromApi(kp_id);
                    }
                }, function (a, c) {
                    // If XML fetch fails, fall back to the main API
                    fetchRatingsFromApi(kp_id);
                }, false, { dataType: 'text' });
            }

            function fetchRatingsFromApi(kp_id) {
                rating_network.clear();
                rating_network.timeout(15000);
                rating_network.silent(rating_params.api_url + 'api/v2.2/films/' + kp_id, function (data) {
                    var kp_api_rating = data.ratingKinopoisk || 0;
                    var imdb_api_rating = data.ratingImdb || 0;
                    var movieRating = _setCache(movie_id, { kp: kp_api_rating, imdb: imdb_api_rating }, rating_params.cache_time);
                    _showExternalRatings(movieRating);
                }, function (a, c) {
                    handleFetchError(rating_network.errorDecode(a, c));
                }, false, { headers: { 'X-API-KEY': rating_params.api_key } });
            }

            function handleNoResults() {
                // Cache no results to avoid repeated failed searches
                var movieRating = _setCache(movie_id, { kp: 0, imdb: 0 }, rating_params.cache_time);
                _showExternalRatings(movieRating); // This will hide the elements if ratings are 0
            }

             function handleFetchError(error_msg) {
                 // Don't cache errors, just hide the placeholders for this session
                 console.error("Lampa Ratings Error:", error_msg);
                 html.find('.new-interface-info__details .rate--kp, .new-interface-info__details .rate--imdb').addClass('lampa-hide');
                 // Optionally show a Lampa.Noty message, but might be too noisy
                 // Lampa.Noty.show('KP/IMDb Рейтинг: ' + error_msg);
             }


            // Inner function to update the specific HTML elements for this instance
            function _showExternalRatings(ratingData) {
                // Ensure we are working within the correct 'create' instance's html
                var kp_elem = _this.html.find('.new-interface-info__details .rate--kp');
                var imdb_elem = _this.html.find('.new-interface-info__details .rate--imdb');

                if (ratingData) {
                    var kp_rating = !isNaN(ratingData.kp) && ratingData.kp > 0 ? parseFloat(ratingData.kp).toFixed(1) : null;
                    var imdb_rating = !isNaN(ratingData.imdb) && ratingData.imdb > 0 ? parseFloat(ratingData.imdb).toFixed(1) : null;


                    if (kp_rating) {
                        kp_elem.find('> div').eq(0).text(kp_rating);
                        kp_elem.removeClass('lampa-hide');
                    } else {
                        kp_elem.addClass('lampa-hide');
                    }

                    if (imdb_rating) {
                        imdb_elem.find('> div').eq(0).text(imdb_rating);
                        imdb_elem.removeClass('lampa-hide');
                    } else {
                        imdb_elem.addClass('lampa-hide');
                    }
                } else {
                     // Hide if no data at all
                     kp_elem.addClass('lampa-hide');
                     imdb_elem.addClass('lampa-hide');
                }
            }

        }; // End of fetchExternalRatings

        this.render = function () {
            return html;
        };

        this.empty = function () {
             // Clear potential rating network activity if info panel is emptied
             rating_network.clear();
        };

        this.destroy = function () {
            network.clear();
            rating_network.clear(); // Clear rating network too
            html.remove();
            loaded = {};
            kp_imdb_loaded = {};
            html = null;
        };
    } // End of create function


    // ##############################################################
    // ## Component function (mostly unchanged from original)      ##
    // ##############################################################
    function component(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({
            mask: true,
            over: true,
            scroll_by_item: true
        });
        var items = [];
        var html = $('<div class="new-interface"><img class="full-start__background"></div>');
        var active = 0;
        var newlampa = Lampa.Manifest.app_digital >= 166;
        var info; // Will hold the instance of 'create'
        var lezydata;
        var viewall = Lampa.Storage.field('card_views_type') == 'view' || Lampa.Storage.field('navigation_type') == 'mouse';
        var background_img = html.find('.full-start__background');
        var background_last = '';
        var background_timer;

        this.create = function () {
            // Initialize the 'create' instance here
            info = new create(); // Pass object if create needs it
            info.create();
             html.append(info.render()); // Add info panel to component html
             scroll.minus(info.render()); // Adjust scroll for info panel height
        };

        this.empty = function () {
            var button;
            if (object.source == 'tmdb') {
                button = $('<div class="empty__footer"><div class="simple-button selector">' + Lampa.Lang.translate('change_source_on_cub') + '</div></div>');
                button.find('.selector').on('hover:enter', function () {
                    Lampa.Storage.set('source', 'cub');
                    Lampa.Activity.replace({ source: 'cub' });
                });
            }
            var empty = new Lampa.Empty();
            html.append(empty.render(button));
            this.start = empty.start;
            this.activity.loader(false);
            this.activity.toggle();
             if (info) info.empty(); // Call empty on info panel too
        };

        this.loadNext = function () {
            var _this = this;
            if (this.next && !this.next_wait && items.length) {
                this.next_wait = true;
                this.next(function (new_data) {
                    _this.next_wait = false;
                    // Filter out items already rendered if necessary (simple check)
                    var current_ids = items.map(function(i){ return i.data ? i.data.id : null });
                    new_data.filter(function(nd){ return current_ids.indexOf(nd.id) === -1; })
                            .forEach(_this.append.bind(_this));

                    Lampa.Layer.visible(scroll.render(true)); // Make sure scroll layer is visible
                }, function () {
                    _this.next_wait = false;
                });
            }
        };


        this.push = function () { }; // Unused?

        this.build = function (data) {
            var _this2 = this;
            lezydata = data;

            // Ensure 'create' instance is ready (moved initialization to this.create)
            if (!info) this.create();

            // Clear previous items before building new list
            Lampa.Arrays.destroy(items);
            items = [];
            scroll.clear(); // Clear scroll container


            data.slice(0, viewall ? data.length : 5).forEach(this.append.bind(this)); // Load initial items
            // Info panel already added in this.create
            html.append(scroll.render()); // Add scroll container

            if (newlampa) {
                Lampa.Layer.update(html); // Update layer with the component's HTML
                Lampa.Layer.visible(scroll.render(true)); // Ensure scroll is visible

                scroll.onEnd = this.loadNext.bind(this);
                scroll.onWheel = function (step) {
                    if (!Lampa.Controller.own(_this2)) _this2.start();
                    if (step > 0) _this2.down();
                    else _this2.up(); // Let up handle going to head if active is 0
                };
                 // Initial focus and info update
                 if (items.length > 0) {
                     items[0].toggle();
                     info.update(items[0].data); // Use item's internal data
                     _this2.background(items[0].data);
                 } else {
                     info.empty(); // Clear info if no items
                 }

            } else {
                 // Fallback or logic for older Lampa versions if needed
                 if (items.length > 0) {
                     items[0].toggle();
                     info.update(items[0].data);
                     _this2.background(items[0].data);
                 } else {
                     info.empty();
                 }
            }

            this.activity.loader(false);
            this.activity.toggle();
        };

        this.background = function (elem) {
            // Debounced background update (unchanged)
            var new_background = Lampa.Api.img(elem.backdrop_path, 'w1280');
            clearTimeout(background_timer);
            if (!new_background || new_background === background_last) return; // Added check for no background
            background_timer = setTimeout(function () {
                background_img.removeClass('loaded');
                background_img[0].onload = function () { background_img.addClass('loaded'); };
                background_img[0].onerror = function () { background_img.removeClass('loaded'); background_last = ''; }; // Reset last on error
                background_last = new_background;
                background_img[0].src = background_last; // Set src directly, onload handles fade
            }, 300); // Shorter delay for responsiveness
        };


        this.append = function (element) {
            var _this3 = this;
            // Prevent adding duplicates if element object is reused
            if (element.rendered_in_list) return;


             element.rendered_in_list = true; // Mark as rendered


            var item = new Lampa.InteractionLine(element, {
                url: element.url,
                card_small: true,
                cardClass: element.cardClass,
                genres: object.genres,
                object: object,
                card_wide: true,
                nomore: element.nomore
            });

            item.create();
            item.onDown = this.down.bind(this);
            item.onUp = this.up.bind(this);
            item.onBack = this.back.bind(this);
            item.onToggle = function (/*toggled_element*/) {
                // Update active index when an item gains focus/control
                var L = Lampa.Controller.enabled().controller; // Current controller link
                if(L && L. Lampa_object === item) { // Check if this item is now the controller's link
                   active = items.indexOf(item);
                   // Ensure scroll updates to the active item
                   scroll.update(items[active].render(), true); // true for immediate scroll
                }
            };

            if (this.onMore) item.onMore = this.onMore.bind(this);

             // Use item.data which InteractionLine should store
            item.onFocus = function (elem, Lampa_object) {
                 if(Lampa_object && Lampa_object.data){
                     info.update(Lampa_object.data);
                     _this3.background(Lampa_object.data);
                     active = items.indexOf(Lampa_object); // Keep active index sync
                 }
            };
            item.onHover = function (elem, Lampa_object) {
                if(Lampa_object && Lampa_object.data){
                    info.update(Lampa_object.data); // Update info on hover
                    _this3.background(Lampa_object.data); // Update background on hover
                }
            };


            item.onFocusMore = info.empty.bind(info); // Clear info when 'more' is focused
            scroll.append(item.render());
            items.push(item);
             // If it's the first item added after initial build, set focus
             if (items.length === 1 && Lampa.Controller.enabled().name !== 'content') {
                 item.toggle();
                 info.update(item.data);
                 _this3.background(item.data);
             }
        };

        this.back = function () {
            Lampa.Activity.backward();
        };

        this.down = function () {
            if (active < items.length - 1) {
                 active++;
                 if (!viewall && active + 3 > items.length && lezydata && items.length < lezydata.length) {
                    // Lazy load more items proactively
                     var next_chunk = lezydata.slice(items.length, items.length + 5); // Load next 5
                     next_chunk.forEach(this.append.bind(this));
                 }
                 items[active].toggle();
                 scroll.update(items[active].render(), true); // Use true for smooth scroll if available
             } else {
                 // Already at the last item, potentially load more if available
                 this.loadNext();
             }
        };

        this.up = function () {
            if (active > 0) {
                active--;
                items[active].toggle();
                scroll.update(items[active].render(), true); // Use true for smooth scroll if available
            } else {
                // At the first item, toggle to head
                Lampa.Controller.toggle('head');
            }
        };

        this.start = function () {
            var _this4 = this;
            Lampa.Controller.add('content', {
                link: this,
                toggle: function toggle() {
                     if (items.length) {
                         // Ensure the 'active' item receives focus if controller returns here
                         items[active].toggle();
                         scroll.update(items[active].render(), true);
                     } else {
                         // No items, maybe focus something else or handle empty state
                         Lampa.Controller.toggle('head'); // Example: fallback to head
                     }
                },
                update: function update() { }, // Placeholder
                left: function left() {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                right: function right() {
                     // Let InteractionLine handle right movement internally first
                     if (!Navigator.canmove('right')) {
                         // If cannot move right within the line, maybe do nothing or custom action
                     } else {
                         Navigator.move('right');
                     }
                },
                up: function up() {
                    // Let InteractionLine handle internal 'up' if applicable, otherwise call component's up
                    if (Navigator.canmove('up')) Navigator.move('up');
                     else _this4.up(); // Move component focus up
                },
                down: function down() {
                     // Let InteractionLine handle internal 'down' if applicable, otherwise call component's down
                    if (Navigator.canmove('down')) Navigator.move('down');
                     else _this4.down(); // Move component focus down
                },
                back: this.back
            });
            Lampa.Controller.toggle('content');

             // Ensure initial state is correct when starting/restarting
             if (items.length > 0) {
                 if (!Lampa.Focus.focused(items[active].render())) { // Check if active item isn't already focused
                     items[active].toggle();
                     scroll.update(items[active].render(), true);
                 }
             }
        };

        this.refresh = function () {
            this.activity.loader(true);
            this.activity.need_refresh = true;
             // Optionally clear caches or reset states here if needed on refresh
             if(info) info.empty(); // Clear info panel during refresh
        };


        this.pause = function () { }; // Unused?
        this.stop = function () { }; // Unused?

        this.render = function () {
            return html;
        };

        this.destroy = function () {
            network.clear();
            Lampa.Arrays.destroy(items);
            scroll.destroy();
            if (info) info.destroy(); // Destroy the 'create' instance
            html.remove();
            items = null;
            network = null;
            lezydata = null;
            info = null;
             clearTimeout(background_timer); // Clear background timer on destroy
        };
    } // End of component function


    // ##############################################################
    // ## Plugin Initialization (mostly unchanged)                 ##
    // ##############################################################
    function startPlugin() {
        window.plugin_interface_ready = true; // Mark new interface as primary ready flag

        // --- CSS Modifications ---
        // Ensure the rating divs display correctly next to TMDB
        var interface_style = `
        <style>
        .new-interface .card--small.card--wide {
            width: 18.3em;
        }
        .new-interface-info {
            position: relative;
            padding: 1.5em;
            height: 24em; /* Adjust as needed */
        }
        .new-interface-info__body {
            width: 80%;
            padding-top: 1.1em;
        }
        .new-interface-info__head {
            color: rgba(255, 255, 255, 0.6);
            margin-bottom: 1em;
            font-size: 1.3em;
            min-height: 1.3em; /* Ensure space even when empty */
            line-height: 1.3;
        }
        .new-interface-info__head span {
            color: #fff;
        }
        .new-interface-info__title {
            font-size: 4em;
            font-weight: 600;
            margin-bottom: 0.3em;
            overflow: hidden;
            text-overflow: ellipsis; /* Use ellipsis */
            white-space: nowrap; /* Prevent wrapping */
           /* display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; */ /* Removed multi-line clamp */
            margin-left: -0.03em;
            line-height: 1.3;
        }
        .new-interface-info__details {
            margin-bottom: 1.6em;
            display: flex;
            flex-direction: row; /* Ensure horizontal layout */
            align-items: center;
            flex-wrap: wrap; /* Allow wrapping if needed */
            min-height: 1.9em;
            font-size: 1.1em;
            gap: 0.5em 1em; /* Add gap between detail items */
        }
        /* Remove separator span margin, use flex gap instead */
        .new-interface-info__split {
           /* margin: 0 1em; */
           display: none; /* Hide the old separator */
        }
         /* Style for ALL rating blocks */
        .new-interface-info__details .full-start__rate {
            font-size: 1.3em;
            /* margin-right: 1em; */ /* Removed margin, use gap */
            display: flex; /* Align number and label */
            align-items: center;
            gap: 0.3em; /* Space between number and label */
             line-height: 1; /* Prevent excessive height */
        }
         /* Style for KP/IMDb loading indicator */
         .new-interface-info__details .rate--kp .broadcast__scan,
         .new-interface-info__details .rate--imdb .broadcast__scan {
            display: inline-block; /* Make scan fit inside */
            vertical-align: middle;
            margin: 0; /* Reset margins */
         }
        .new-interface-info__description {
            font-size: 1.2em;
            font-weight: 300;
            line-height: 1.5;
            overflow: hidden;
            text-overflow: ellipsis; /* Use ellipsis */
            display: -webkit-box;
            -webkit-line-clamp: 4; /* Max 4 lines */
            line-clamp: 4;
            -webkit-box-orient: vertical;
            width: 70%;
             min-height: 1.5em; /* Ensure space even if empty initially */
        }
        .new-interface .card-more__box {
            padding-bottom: 95%;
        }
        .new-interface .full-start__background {
             /* Ensure background covers area, adjust as needed */
            height: 115%;
            top: -6em;
            width: 100%;
            object-fit: cover;
             opacity: 0; /* Start hidden */
             transition: opacity 0.5s ease-in-out; /* Fade transition */
        }
         .new-interface .full-start__background.loaded {
             opacity: 1; /* Fade in when loaded */
         }

        .new-interface .card__promo { display: none; }
        .new-interface .card.card--wide+.card-more .card-more__box { padding-bottom: 95%; }
        .new-interface .card.card--wide .card-watched { display: none !important; }

        body.light--version .new-interface-info__body { width: 69%; padding-top: 1.5em; }
        body.light--version .new-interface-info { height: 25.3em; }

        /* Lampa hide utility */
        .lampa-hide { display: none !important; }

         /* Animation Styles (unchanged) */
        body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view{
            animation: animation-card-focus 0.2s;
        }
        body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view{
            animation: animation-trigger-enter 0.2s forwards;
        }
        </style>
        `;
        Lampa.Template.add('new_interface_style', interface_style);
        // Append or replace the style in the body
         var existing_style = document.getElementById('new_interface_style_tag');
         if(existing_style) existing_style.remove(); // Remove old style if exists
         var style_tag = document.createElement('style');
         style_tag.id = 'new_interface_style_tag';
         style_tag.innerHTML = Lampa.Template.get('new_interface_style', {}, true);
         document.body.appendChild(style_tag);


        // --- Interface Switching Logic ---
        var old_interface = Lampa.InteractionMain;
        var new_interface = component;

        Lampa.InteractionMain = function (object) {
            var use_new = true; // Default to new interface

            // Conditions to use OLD interface
            if (!(object.source == 'tmdb' || object.source == 'cub')) use_new = false;
            if (window.innerWidth < 767) use_new = false;
            if (!Lampa.Account.hasPremium()) use_new = false;
            if (Lampa.Manifest.app_digital < 153) use_new = false;

            // Use the selected interface constructor
            return use_new ? new new_interface(object) : new old_interface(object);
        };
    }

    // Run the plugin setup only once
    if (!window.plugin_interface_ready) {
        startPlugin();
    }

})();
