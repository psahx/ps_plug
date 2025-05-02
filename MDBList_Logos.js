// == Step 1: Add Logo Setting (Last, Default Off) + Logging ==
(function () {
    'use strict';
    console.log('[Step 1 Init] Plugin loading...'); // Log plugin start for this step

    // --- Fetcher Configuration --- (Baseline - Unchanged)
    var config = {
        api_url: 'https://api.mdblist.com/tmdb/',
        cache_time: 60 * 60 * 12 * 1000,
        cache_key: 'mdblist_ratings_cache',
        cache_limit: 500,
        request_timeout: 10000
    };

    // --- Language Strings ---
    if (window.Lampa && Lampa.Lang) {
        Lampa.Lang.add({
            // --- Original MDBList Strings ---
            mdblist_api_key_desc: { ru: "...", en: "Enter your API key from MDBList.com", uk: "..." },
            additional_ratings_title: { ru: "...", en: "Additional Ratings", uk: "..." },
            select_ratings_button_name: { en: "Select Rating Providers", ru: "...", uk: "..." },
            select_ratings_button_desc: { en: "Choose which ratings to display", ru: "...", uk: "..." },
            select_ratings_dialog_title: { en: "Select Ratings", ru: "...", uk: "..." },
            full_notext: { en: 'No description', ru: 'Нет описания'}, // Keep this one

            // *** NEW: Movie Logo Strings Added ***
            movie_logo_toggle_name: {
                en: "Movie Logo",
                ru: "Логотип фильма",
                uk: "Логотип фільму"
            },
            movie_logo_toggle_desc: {
                en: "Display media logos instead of text titles",
                ru: "Отображать логотипы медиа вместо текстовых названий",
                uk: "Відображати логотипи медіа замість текстових назв"
            }
        });
        console.log('[Step 1 Lang] Language strings added/updated.');
    }


    // --- Settings UI Registration ---
    if (window.Lampa && Lampa.SettingsApi) {
        console.log('[Step 1 Settings] Registering settings component and parameters...');
        // 1. Add the Settings Category (Baseline - Unchanged)
        Lampa.SettingsApi.addComponent({
            component: 'additional_ratings',
            name: Lampa.Lang.translate('additional_ratings_title'),
            icon: '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" xml:space="preserve" width="32" height="32" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>'
        });

        // 2. Add the API Key parameter (Baseline - Unchanged)
        Lampa.SettingsApi.addParam({
            component: 'additional_ratings',
            param: { name: 'mdblist_api_key', type: 'input', 'default': '', values: {}, placeholder: 'Enter your MDBList API Key' },
            field: { name: 'MDBList API Key', description: Lampa.Lang.translate('mdblist_api_key_desc') },
            onChange: function() { Lampa.Settings.update(); }
        });

        // 3. Add Button to Open Rating Selection (Baseline - Unchanged)
        Lampa.SettingsApi.addParam({
            component: 'additional_ratings',
            param: { name: 'select_ratings_button', type: 'button' },
            field: { name: Lampa.Lang.translate('select_ratings_button_name'), description: Lampa.Lang.translate('select_ratings_button_desc') },
            onChange: function () { showRatingProviderSelection(); }
        });

        // *** NEW: Add Movie Logo Toggle Setting (Last, Default Off) ***
        console.log('[Step 1 Settings] Adding "Movie Logo" setting parameter...');
        Lampa.SettingsApi.addParam({
            component: 'additional_ratings', // Target the existing component
            param: {
                name: 'show_media_logos',     // Internal name for the setting value
                type: 'trigger',             // Use toggle switch type
                'default': 'false',          // *** Default state set to OFF ***
            },
            field: {
                name: Lampa.Lang.translate('movie_logo_toggle_name'),       // Display name (translated)
                description: Lampa.Lang.translate('movie_logo_toggle_desc') // Description (translated)
            }
            // No onChange needed currently
        });
        console.log('[Step 1 Settings] "Movie Logo" setting parameter added.');
        // *** END NEW Setting ***

    } else {
        console.error("[Step 1 Settings] Lampa.SettingsApi not available.");
    }

    // --- Network Instance --- (Baseline - Unchanged)
    var network = (window.Lampa && Lampa.Reguest) ? new Lampa.Reguest() : null;

    // --- Caching Functions --- (Baseline - Unchanged)
    function getCache(tmdb_id) { /* ... baseline code ... */ }
    function setCache(tmdb_id, data) { /* ... baseline code ... */ }

    // --- Core Fetching Logic --- (Baseline - Unchanged)
    function fetchRatings(movieData, callback) { /* ... baseline MDBList fetching code ... */ }

    // --- MDBList Fetcher State --- (Baseline - Unchanged)
    var mdblistRatingsCache = {};
    var mdblistRatingsPending = {};

    // --- Function to display rating provider selection --- (Baseline - Unchanged)
    function showRatingProviderSelection() { /* ... baseline code ... */ }

    // --- create function (Info Panel Handler) --- (Baseline - Unchanged)
    function create() { /* ... baseline code ... */ }

    // --- component function (Main List Handler) --- (Baseline - Unchanged)
    function component(object) { /* ... baseline code ... */ }


    // --- Plugin Initialization Logic --- (Baseline - Unchanged)
    function startPlugin() {
        console.log('[Step 1 startPlugin] Called.');
        if (!window.Lampa || !Lampa.Utils || !Lampa.Lang || !Lampa.Storage || !Lampa.TMDB || !Lampa.Template || !Lampa.Reguest || !Lampa.Api || !Lampa.InteractionLine || !Lampa.Scroll || !Lampa.Activity || !Lampa.Controller) { console.error("[Step 1 startPlugin] Missing Lampa components"); return; }
        // Lampa.Lang.add for full_notext moved to main Lang block
        window.plugin_interface_ready = true; var old_interface = Lampa.InteractionMain; var new_interface = component;
        Lampa.InteractionMain = function (object) { var use = new_interface; if (!(object.source == 'tmdb' || object.source == 'cub')) use = old_interface; if (window.innerWidth < 767) use = old_interface; if (!Lampa.Account.hasPremium()) use = old_interface; if (Lampa.Manifest.app_digital < 153) use = old_interface; return new use(object); };
        console.log('[Step 1 startPlugin] Interface override applied.');

        // CSS Styles (Baseline - Unchanged)
        var style_id = 'new_interface_style_adjusted_padding';
        if (!$('style[data-id="' + style_id + '"]').length) {
             $('style[data-id^="new_interface_style_"]').remove();
            Lampa.Template.add(style_id, `<style data-id="${style_id}"> /* --- All Baseline CSS --- */ </style>`);
            $('body').append(Lampa.Template.get(style_id, {}, true));
            console.log('[Step 1 startPlugin] CSS styles applied.');
        }
        console.log('[Step 1 startPlugin] Finished.');
    }

    // Original check before starting (Baseline - Unchanged)
    if (!window.plugin_interface_ready) {
        console.log('[Step 1 Init] Calling startPlugin()...');
        startPlugin();
    } else {
        console.log('[Step 1 Init] Skipping startPlugin() as plugin_interface_ready is already true.');
    }
    console.log('[Step 1 Init] Plugin execution finished.');

})(); // End Main IIFE
