// == MDBList Ratings Fetcher ==
// Purpose: Fetches various ratings from MDBList API (api.mdblist.com)
//          Handles caching and provides results via callback.
//          Allows API key configuration via Lampa Settings > More.

(function(window) {
    'use strict';

    // --- Configuration ---
    var config = {
        api_url: 'https://api.mdblist.com/tmdb/', // Base URL for MDBList TMDB endpoint
        // api_key is now configured via Lampa Settings -> More
        cache_time: 60 * 60 * 12 * 1000, // 12 hours cache duration
        cache_key: 'mdblist_ratings_cache', // Unique storage key for ratings data
        cache_limit: 500, // Max items in cache
        request_timeout: 10000 // 10 seconds request timeout
    };

    // --- Language Strings ---
    // Add description for the settings menu item
    if (window.Lampa && Lampa.Lang) {
        Lampa.Lang.add({
            mdblist_api_key_desc: {
                ru: "Введите ваш API ключ с сайта api.mdblist.com (требуется для MDBLIST_Fetcher)",
                en: "Enter your API key from api.mdblist.com (required for MDBLIST_Fetcher)",
                uk: "Введіть ваш API ключ з сайту api.mdblist.com (потрібно для MDBLIST_Fetcher)"
            }
        });
    }

    // --- Settings UI Registration ---
    // Add input field to Lampa Settings > More
    if (window.Lampa && Lampa.SettingsApi) {
        Lampa.SettingsApi.addParam({
            component: 'more', // <--- Changed from 'other' to 'more'
            param: {
                name: 'mdblist_api_key', // Storage key for the API key
                type: 'input',          // Input field type
                'default': '',          // Default value (empty)
                values: {},            // Making sure theres something in there
                placeholder: 'Enter your MDBList API Key' // Placeholder text
            },
            field: {
                name: 'MDBList API Key', // Display name in settings
                description: Lampa.Lang.translate('mdblist_api_key_desc') // Use translated description
            },
            onChange: function() {
                // Optional: Clear cache if API key changes? For now, just update settings.
                Lampa.Settings.update();
            }
        });
    } else {
        console.error("MDBLIST_Fetcher: Lampa.SettingsApi not available. Cannot create API Key setting.");
    }

    // --- Network Instance ---
    // Use Lampa.Reguest if available for consistency and potential benefits
    var network = (window.Lampa && Lampa.Reguest) ? new Lampa.Reguest() : null;

    // --- Caching Functions ---
    function getCache(tmdb_id) {
        // Ensure Lampa Storage is available for caching
        if (!window.Lampa || !Lampa.Storage) return false;
        var timestamp = new Date().getTime();
        var cache = Lampa.Storage.cache(config.cache_key, config.cache_limit, {}); // Use Lampa's cache utility

        if (cache[tmdb_id]) {
            // Check if cache entry has expired
            if ((timestamp - cache[tmdb_id].timestamp) > config.cache_time) {
                delete cache[tmdb_id];
                Lampa.Storage.set(config.cache_key, cache); // Update storage after removing expired entry
                // console.log("MDBLIST_Fetcher: Cache expired for TMDB ID:", tmdb_id);
                return false;
            }
            // console.log("MDBLIST_Fetcher: Cache hit for TMDB ID:", tmdb_id);
            return cache[tmdb_id].data; // Return cached data { imdb: ..., tmdb: ..., etc... }
        }
        // console.log("MDBLIST_Fetcher: Cache miss for TMDB ID:", tmdb_id);
        return false;
    }

    function setCache(tmdb_id, data) {
        // Ensure Lampa Storage is available
        if (!window.Lampa || !Lampa.Storage) return;
        var timestamp = new Date().getTime();
        var cache = Lampa.Storage.cache(config.cache_key, config.cache_limit, {});
        // Store data along with a timestamp
        cache[tmdb_id] = {
            timestamp: timestamp,
            data: data
        };
        Lampa.Storage.set(config.cache_key, cache); // Save updated cache to storage
        // console.log("MDBLIST_Fetcher: Cached data for TMDB ID:", tmdb_id, data);
    }

    // --- Core Fetching Logic ---
    /**
     * Fetches ratings for a given movie/show from MDBList.
     * @param {object} movieData - Object containing movie details. Requires 'id' (TMDB ID) and 'method' ('movie' or 'tv').
     * @param {function} callback - Function to call with the result object (e.g., {imdb: 7.5, tmdb: 8.0, error: null}) or error ({error: 'message'}).
     */
    function fetchRatings(movieData, callback) {
        // Check if Lampa components are available
        if (!network) {
             console.error("MDBLIST_Fetcher: Lampa.Reguest not available.");
             if (callback) callback({ error: "Network component unavailable" });
             return;
        }
        if (!window.Lampa || !Lampa.Storage) {
             console.error("MDBLIST_Fetcher: Lampa.Storage not available.");
             if (callback) callback({ error: "Storage component unavailable" });
             return;
        }

        // Validate input data
        if (!movieData || !movieData.id || !movieData.method || !callback) {
             console.error("MDBLIST_Fetcher: Invalid input - requires movieData object with 'id' and 'method' ('movie'/'tv'), and a callback function.");
             if (callback) callback({ error: "Invalid input data" });
             return;
        }

        var tmdb_id = movieData.id;

        // 1. Check Cache
        var cached_ratings = getCache(tmdb_id);
        if (cached_ratings) {
            // If valid cache exists, return it immediately via callback
            callback(cached_ratings);
            return;
        }

        // 2. Get API Key from Storage
        var apiKey = Lampa.Storage.get('mdblist_api_key');
        if (!apiKey) {
            // console.error("MDBLIST_Fetcher: MDBList API Key not found in Lampa Storage (Settings > More).");
            // No need to cache this error, as it depends on user config
            // Updated error message to reflect 'More' section
            callback({ error: "MDBList API Key not configured in More settings" });
            return;
        }

        // 3. Prepare API Request
        // MDBList uses 'show' for TV series
        var media_type = movieData.method === 'tv' ? 'show' : 'movie';
        // Construct URL using the retrieved API key
        var api_url = "".concat(config.api_url).concat(media_type, "/").concat(tmdb_id, "?apikey=").concat(apiKey);

        // console.log("MDBLIST_Fetcher: Fetching from URL:", api_url);

        // 4. Make Network Request using Lampa.Request
        network.clear(); // Clear previous requests on this instance
        network.timeout(config.request_timeout);
        network.silent(api_url, function (response) {
            // --- Success Callback ---
            var ratingsResult = { error: null }; // Initialize result object

            if (response && response.ratings && Array.isArray(response.ratings)) {
                 // console.log("MDBLIST_Fetcher: Received ratings array:", response.ratings);
                 // Populate result object dynamically from the ratings array
                 response.ratings.forEach(function(rating) {
                     // Use source name directly as key, only if value is not null
                     if (rating.source && rating.value !== null) {
                          ratingsResult[rating.source] = rating.value;
                     }
                 });
            } else if (response && response.error) {
                // Handle specific errors from MDBList API (e.g., invalid key)
                console.error("MDBLIST_Fetcher: API Error from MDBList for TMDB ID:", tmdb_id, response.error);
                ratingsResult.error = "MDBList API Error: " + response.error;
            }
             else {
                 console.error("MDBLIST_Fetcher: Invalid response format received from MDBList for TMDB ID:", tmdb_id, response);
                 ratingsResult.error = "Invalid response format from MDBList";
            }

            // Cache the processed result (even if it's just {error: ...})
            // Only cache successful results or non-auth related errors
            if (ratingsResult.error === null || (ratingsResult.error && !ratingsResult.error.toLowerCase().includes("invalid api key"))) {
                 setCache(tmdb_id, ratingsResult);
            }
            // Execute the original callback with the result
            callback(ratingsResult);

        }, function (xhr, status) {
            // --- Error Callback ---
            var errorMessage = "MDBList request failed";
            if (status) { errorMessage += " (Status: " + status + ")"; }
            // Avoid logging the full URL which contains the API key
            console.error("MDBLIST_Fetcher:", errorMessage, "for TMDB ID:", tmdb_id);

            var errorResult = { error: errorMessage };

            // Cache the error state to prevent rapid retries on persistent failures
            // Avoid caching auth-related errors (like 401 Unauthorized) caused by bad keys
            if (status !== 401 && status !== 403) {
                setCache(tmdb_id, errorResult);
            }
            // Execute the original callback with the error result
            callback(errorResult);
        }); // End network.silent
    } // End fetchRatings

    // --- Expose Public Interface ---
    // Make the fetchRatings function available globally via MDBLIST_Fetcher.fetch
    window.MDBLIST_Fetcher = {
        fetch: fetchRatings
        // You could add other utility functions here if needed, e.g., clearCache
    };

})(window); // Pass the window object
// == MDBList Ratings Fetcher ==
// Purpose: Fetches various ratings from MDBList API (api.mdblist.com)
//          Handles caching and provides results via callback.
//          Allows API key configuration via Lampa Settings > More.

(function(window) {
    'use strict';

    // --- Configuration ---
    var config = {
        api_url: 'https://api.mdblist.com/tmdb/', // Base URL for MDBList TMDB endpoint
        // api_key is now configured via Lampa Settings -> More
        cache_time: 60 * 60 * 12 * 1000, // 12 hours cache duration
        cache_key: 'mdblist_ratings_cache', // Unique storage key for ratings data
        cache_limit: 500, // Max items in cache
        request_timeout: 10000 // 10 seconds request timeout
    };

    // --- Language Strings ---
    // Add description for the settings menu item
    if (window.Lampa && Lampa.Lang) {
        Lampa.Lang.add({
            mdblist_api_key_desc: {
                ru: "Введите ваш API ключ с сайта api.mdblist.com (требуется для MDBLIST_Fetcher)",
                en: "Enter your API key from api.mdblist.com (required for MDBLIST_Fetcher)",
                uk: "Введіть ваш API ключ з сайту api.mdblist.com (потрібно для MDBLIST_Fetcher)"
            }
        });
    }

    // --- Settings UI Registration ---
    // Add input field to Lampa Settings > More
    if (window.Lampa && Lampa.SettingsApi) {
        Lampa.SettingsApi.addParam({
            component: 'more', // <--- Changed from 'other' to 'more'
            param: {
                name: 'mdblist_api_key', // Storage key for the API key
                type: 'input',          // Input field type
                'default': '',          // Default value (empty)
                placeholder: 'Enter your MDBList API Key' // Placeholder text
            },
            field: {
                name: 'MDBList API Key', // Display name in settings
                description: Lampa.Lang.translate('mdblist_api_key_desc') // Use translated description
            },
            onChange: function() {
                // Optional: Clear cache if API key changes? For now, just update settings.
                Lampa.Settings.update();
            }
        });
    } else {
        console.error("MDBLIST_Fetcher: Lampa.SettingsApi not available. Cannot create API Key setting.");
    }

    // --- Network Instance ---
    // Use Lampa.Reguest if available for consistency and potential benefits
    var network = (window.Lampa && Lampa.Reguest) ? new Lampa.Reguest() : null;

    // --- Caching Functions ---
    function getCache(tmdb_id) {
        // Ensure Lampa Storage is available for caching
        if (!window.Lampa || !Lampa.Storage) return false;
        var timestamp = new Date().getTime();
        var cache = Lampa.Storage.cache(config.cache_key, config.cache_limit, {}); // Use Lampa's cache utility

        if (cache[tmdb_id]) {
            // Check if cache entry has expired
            if ((timestamp - cache[tmdb_id].timestamp) > config.cache_time) {
                delete cache[tmdb_id];
                Lampa.Storage.set(config.cache_key, cache); // Update storage after removing expired entry
                // console.log("MDBLIST_Fetcher: Cache expired for TMDB ID:", tmdb_id);
                return false;
            }
            // console.log("MDBLIST_Fetcher: Cache hit for TMDB ID:", tmdb_id);
            return cache[tmdb_id].data; // Return cached data { imdb: ..., tmdb: ..., etc... }
        }
        // console.log("MDBLIST_Fetcher: Cache miss for TMDB ID:", tmdb_id);
        return false;
    }

    function setCache(tmdb_id, data) {
        // Ensure Lampa Storage is available
        if (!window.Lampa || !Lampa.Storage) return;
        var timestamp = new Date().getTime();
        var cache = Lampa.Storage.cache(config.cache_key, config.cache_limit, {});
        // Store data along with a timestamp
        cache[tmdb_id] = {
            timestamp: timestamp,
            data: data
        };
        Lampa.Storage.set(config.cache_key, cache); // Save updated cache to storage
        // console.log("MDBLIST_Fetcher: Cached data for TMDB ID:", tmdb_id, data);
    }

    // --- Core Fetching Logic ---
    /**
     * Fetches ratings for a given movie/show from MDBList.
     * @param {object} movieData - Object containing movie details. Requires 'id' (TMDB ID) and 'method' ('movie' or 'tv').
     * @param {function} callback - Function to call with the result object (e.g., {imdb: 7.5, tmdb: 8.0, error: null}) or error ({error: 'message'}).
     */
    function fetchRatings(movieData, callback) {
        // Check if Lampa components are available
        if (!network) {
             console.error("MDBLIST_Fetcher: Lampa.Reguest not available.");
             if (callback) callback({ error: "Network component unavailable" });
             return;
        }
        if (!window.Lampa || !Lampa.Storage) {
             console.error("MDBLIST_Fetcher: Lampa.Storage not available.");
             if (callback) callback({ error: "Storage component unavailable" });
             return;
        }

        // Validate input data
        if (!movieData || !movieData.id || !movieData.method || !callback) {
             console.error("MDBLIST_Fetcher: Invalid input - requires movieData object with 'id' and 'method' ('movie'/'tv'), and a callback function.");
             if (callback) callback({ error: "Invalid input data" });
             return;
        }

        var tmdb_id = movieData.id;

        // 1. Check Cache
        var cached_ratings = getCache(tmdb_id);
        if (cached_ratings) {
            // If valid cache exists, return it immediately via callback
            callback(cached_ratings);
            return;
        }

        // 2. Get API Key from Storage
        var apiKey = Lampa.Storage.get('mdblist_api_key');
        if (!apiKey) {
            // console.error("MDBLIST_Fetcher: MDBList API Key not found in Lampa Storage (Settings > More).");
            // No need to cache this error, as it depends on user config
            // Updated error message to reflect 'More' section
            callback({ error: "MDBList API Key not configured in More settings" });
            return;
        }

        // 3. Prepare API Request
        // MDBList uses 'show' for TV series
        var media_type = movieData.method === 'tv' ? 'show' : 'movie';
        // Construct URL using the retrieved API key
        var api_url = "".concat(config.api_url).concat(media_type, "/").concat(tmdb_id, "?apikey=").concat(apiKey);

        // console.log("MDBLIST_Fetcher: Fetching from URL:", api_url);

        // 4. Make Network Request using Lampa.Request
        network.clear(); // Clear previous requests on this instance
        network.timeout(config.request_timeout);
        network.silent(api_url, function (response) {
            // --- Success Callback ---
            var ratingsResult = { error: null }; // Initialize result object

            if (response && response.ratings && Array.isArray(response.ratings)) {
                 // console.log("MDBLIST_Fetcher: Received ratings array:", response.ratings);
                 // Populate result object dynamically from the ratings array
                 response.ratings.forEach(function(rating) {
                     // Use source name directly as key, only if value is not null
                     if (rating.source && rating.value !== null) {
                          ratingsResult[rating.source] = rating.value;
                     }
                 });
            } else if (response && response.error) {
                // Handle specific errors from MDBList API (e.g., invalid key)
                console.error("MDBLIST_Fetcher: API Error from MDBList for TMDB ID:", tmdb_id, response.error);
                ratingsResult.error = "MDBList API Error: " + response.error;
            }
             else {
                 console.error("MDBLIST_Fetcher: Invalid response format received from MDBList for TMDB ID:", tmdb_id, response);
                 ratingsResult.error = "Invalid response format from MDBList";
            }

            // Cache the processed result (even if it's just {error: ...})
            // Only cache successful results or non-auth related errors
            if (ratingsResult.error === null || (ratingsResult.error && !ratingsResult.error.toLowerCase().includes("invalid api key"))) {
                 setCache(tmdb_id, ratingsResult);
            }
            // Execute the original callback with the result
            callback(ratingsResult);

        }, function (xhr, status) {
            // --- Error Callback ---
            var errorMessage = "MDBList request failed";
            if (status) { errorMessage += " (Status: " + status + ")"; }
            // Avoid logging the full URL which contains the API key
            console.error("MDBLIST_Fetcher:", errorMessage, "for TMDB ID:", tmdb_id);

            var errorResult = { error: errorMessage };

            // Cache the error state to prevent rapid retries on persistent failures
            // Avoid caching auth-related errors (like 401 Unauthorized) caused by bad keys
            if (status !== 401 && status !== 403) {
                setCache(tmdb_id, errorResult);
            }
            // Execute the original callback with the error result
            callback(errorResult);
        }); // End network.silent
    } // End fetchRatings

    // --- Expose Public Interface ---
    // Make the fetchRatings function available globally via MDBLIST_Fetcher.fetch
    window.MDBLIST_Fetcher = {
        fetch: fetchRatings
        // You could add other utility functions here if needed, e.g., clearCache
    };

})(window); // Pass the window object
