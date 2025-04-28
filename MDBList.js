// == Lampa Plugin: Interface Patcher - Step 4.2 ==
// Purpose: Use flag polling to detect CUB readiness, then poll the DOM
//          for the target element's presence and log the result. NO wrapping/patching.
// Strategy: Poll flag -> Start DOM poll -> Log finding.
// Version: 4.2 (Flag Poll -> DOM Poll)
(function () {
    'use strict';

    const PLUGIN_NAME = "InterfacePatcher Step 4.2 (Flag Poll -> DOM Poll)";

    // --- Lampa Readiness Check ---
    if (!window.Lampa || !window.Lampa.Listener || !window.Lampa.Template || !window.Lampa.Storage || !window.Lampa.Api || !window.Lampa.Utils || !window.Lampa.Lang || !window.$) {
        console.error(`${PLUGIN_NAME}: Required Lampa components missing.`); return;
    } else {
        console.log(`${PLUGIN_NAME}: Base Lampa components found.`);
    }

    // --- Constants ---
    const STYLE_ID = 'patched_new_interface_style_step4'; // Consistent ID for step 4 series
    const FLAG_POLLING_INTERVAL_MS = 250;
    const MAX_FLAG_POLLING_ATTEMPTS = 60; // ~15 seconds for flag
    const DOM_POLLING_INTERVAL_MS = 200;
    const MAX_DOM_POLLING_ATTEMPTS = 25; // ~5 seconds for DOM element after flag
    const TARGET_INFO_ELEMENT_SELECTOR = '.new-interface-info'; // Element to check for

    // --- State Variables ---
    let flagPollingIntervalId = null;
    let flagPollingAttempts = 0;
    let domPollingIntervalId = null;
    let domPollingAttempts = 0;
    let flagCheckComplete = false; // Ensure flag check completion actions run only once
    let domCheckComplete = false;  // Ensure DOM check completion actions run only once

    // --- CSS Injection Function ---
    function injectCSS() {
        console.log(`${PLUGIN_NAME}: Attempt CSS inject (Style ID: ${STYLE_ID})...`);
        try {
            $('style[data-id^="patched_new_interface_style_step"]').remove(); // Clean previous step styles
            if ($('style[data-id="' + STYLE_ID + '"]').length) { return; }
            const css = `<style data-id="${STYLE_ID}">/* ... FULL CSS content ... */ .new-interface-info{height:22.5em;}.new-interface .full-start__rate{font-size:1.3em;margin-right:0em;display:inline-flex;align-items:center;vertical-align:middle;background-color:rgba(255,255,255,0.12);padding:0 0.2em 0 0;border-radius:0.3em;gap:0.5em;overflow:hidden;height:auto;}.new-interface .full-start__rate>div{font-weight:normal;font-size:1em;justify-content:center;background-color:rgba(0,0,0,0.4);color:#fff;padding:0.1em 0.3em;border-radius:0.3em;line-height:1.3;order:1;display:flex;align-items:center;flex-shrink:0;}.rt-rating-item>div.rt-score{padding-left:1.2em;padding-right:1.2em;}.placeholder-value{color:rgba(255,255,255,0.6);}.rating-logo{height:1.1em;width:auto;max-width:75px;vertical-align:middle;order:2;line-height:0;flex-shrink:0;}.tmdb-logo{height:.9em;}.rt-logo{height:1.1em;}.new-interface .card--small.card--wide{width:18.3em;}.new-interface-info{position:relative;padding:1.5em;}.new-interface-info__body{width:80%;padding-top:1.1em;}.new-interface-info__head{color:rgba(255,255,255,0.6);margin-bottom:1em;font-size:1.3em;min-height:1em;}.new-interface-info__head span{color:#fff;}.new-interface-info__title{font-size:4em;font-weight:600;margin-bottom:.3em;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical;margin-left:-0.03em;line-height:1.3;}.new-interface-info__details{margin-bottom:1.6em;display:flex;align-items:center;flex-wrap:wrap;min-height:1.9em;font-size:1.1em;gap:.5em 0;}.new-interface-info__split{margin:0 1em;font-size:.7em;display:inline-block;vertical-align:middle;}.new-interface-info__description{font-size:1.2em;font-weight:300;line-height:1.5;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:4;line-clamp:4;-webkit-box-orient:vertical;width:70%;}.new-interface .card-more__box{padding-bottom:95%;}.new-interface .full-start__background{height:108%;top:-6em;}.new-interface .card__promo{display:none;}.new-interface .card.card--wide+.card-more .card-more__box{padding-bottom:95%;}.new-interface .card.card--wide .card-watched{display:none!important;}body.light--version .new-interface-info__body{width:69%;padding-top:1.5em;}body.light--version .new-interface-info{height:25.3em;}body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view{animation:animation-card-focus .2s} body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view{animation:animation-trigger-enter .2s forwards}</style>`;
            Lampa.Template.add(STYLE_ID, css); $('body').append(Lampa.Template.get(STYLE_ID, {}, !0));
            console.log(`${PLUGIN_NAME}: CSS Injected successfully.`);
        } catch (e) { console.error(`${PLUGIN_NAME}: CSS injection error`, e); }
    }

    // --- Initialization & Checking Logic ---

    // Function to check the DOM for the target element (called by DOM polling interval)
    function checkDOMPresence() {
        // Stop if DOM check already completed or corresponding interval ID is missing
        if (domCheckComplete || domPollingIntervalId === null) {
             if(domPollingIntervalId) clearInterval(domPollingIntervalId);
             domPollingIntervalId = null;
             return;
        }

        domPollingAttempts++;
        console.debug(`${PLUGIN_NAME}: DOM Poll attempt #${domPollingAttempts}/${MAX_DOM_POLLING_ATTEMPTS} for '${TARGET_INFO_ELEMENT_SELECTOR}'...`);

        try {
            const $element = $(TARGET_INFO_ELEMENT_SELECTOR);
            const found = $element.length > 0;

            if (found) {
                console.log(`%c${PLUGIN_NAME}: Target element '${TARGET_INFO_ELEMENT_SELECTOR}' FOUND after ${domPollingAttempts} DOM polls.`, 'color: green; font-weight: bold;');
                console.log(`${PLUGIN_NAME}: Target element instance:`, $element[0]);
                domCheckComplete = true; // Mark DOM check as done
                clearInterval(domPollingIntervalId); // Stop DOM polling
                domPollingIntervalId = null;
                // ** SUCCESS POINT FOR STEP 4 **
                // In future steps, we would trigger patching using the found element ($element).
            } else if (domPollingAttempts >= MAX_DOM_POLLING_ATTEMPTS) {
                console.warn(`${PLUGIN_NAME}: Max DOM polling attempts reached (${MAX_DOM_POLLING_ATTEMPTS}). Target element '${TARGET_INFO_ELEMENT_SELECTOR}' not found.`);
                domCheckComplete = true; // Mark DOM check as done (failed)
                clearInterval(domPollingIntervalId); // Stop DOM polling
                domPollingIntervalId = null;
            }
        } catch(e) {
             console.error(`${PLUGIN_NAME}: Error during DOM polling check:`, e);
             domCheckComplete = true; // Mark as done to stop
             clearInterval(domPollingIntervalId); // Stop polling on error
             domPollingIntervalId = null;
        }
    }

    // Polling function to check for the CUB interface flag
    function checkFlagAndStartDOMPoll() {
        // Stop checking flag if this stage is already complete
        if (flagCheckComplete) {
            if (flagPollingIntervalId) clearInterval(flagPollingIntervalId);
            flagPollingIntervalId = null;
            return;
        }

        flagPollingAttempts++;
        // console.debug(`${PLUGIN_NAME}: Flag Poll attempt #${flagPollingAttempts}/${MAX_FLAG_POLLING_ATTEMPTS} for window.plugin_interface_ready...`);

        if (window.plugin_interface_ready === true) {
            console.log(`%c${PLUGIN_NAME}: Flag window.plugin_interface_ready detected! (Attempt #${flagPollingAttempts}). Starting DOM polling.`, 'color: green');
            flagCheckComplete = true; // Mark flag check stage done
            if (flagPollingIntervalId) clearInterval(flagPollingIntervalId); // Stop flag polling
            flagPollingIntervalId = null;

            // ** Start polling for the DOM element **
            if (domPollingIntervalId) clearInterval(domPollingIntervalId); // Clear previous DOM poll just in case
            domPollingAttempts = 0; // Reset DOM poll counter
            domCheckComplete = false; // Reset DOM check completion flag
            console.log(`${PLUGIN_NAME}: Starting DOM polling for '${TARGET_INFO_ELEMENT_SELECTOR}' (Max ${MAX_DOM_POLLING_ATTEMPTS} attempts @ ${DOM_POLLING_INTERVAL_MS}ms)...`);

            checkDOMPresence(); // Initial check immediately after flag detection

            // Start interval only if element not found immediately and check isn't already marked complete
            if (!domCheckComplete && !domPollingIntervalId) {
                 domPollingIntervalId = setInterval(checkDOMPresence, DOM_POLLING_INTERVAL_MS);
            }

        } else if (flagPollingAttempts >= MAX_FLAG_POLLING_ATTEMPTS) {
            console.warn(`${PLUGIN_NAME}: Max flag polling attempts reached (${MAX_FLAG_POLLING_ATTEMPTS}). Flag not detected. DOM check will not run.`);
            flagCheckComplete = true; // Mark flag check stage done (failed)
            if (flagPollingIntervalId) clearInterval(flagPollingIntervalId); // Stop flag polling
            flagPollingIntervalId = null;
        }
    }

    // --- Plugin Start ---
    console.log(`${PLUGIN_NAME}: Script loaded.`);
    Lampa.Listener.follow('app', (e) => {
        if (e.type == 'ready') {
            console.log(`${PLUGIN_NAME}: App ready event received.`);
            injectCSS(); // Inject CSS

            // Reset state variables on app ready (important for potential reloads)
            if (flagPollingIntervalId) clearInterval(flagPollingIntervalId);
            if (domPollingIntervalId) clearInterval(domPollingIntervalId);
            flagPollingAttempts = 0;
            domPollingAttempts = 0;
            flagCheckComplete = false;
            domCheckComplete = false;
            // pluginInitializationSucceeded = false; // This flag not used in this step

            // Start polling for the CUB interface flag
            console.log(`${PLUGIN_NAME}: Starting polling for flag 'window.plugin_interface_ready' (Max ${MAX_FLAG_POLLING_ATTEMPTS} attempts @ ${FLAG_POLLING_INTERVAL_MS}ms)...`);
            checkFlagAndStartDOMPoll(); // Initial check

            // Start interval only if flag not found immediately
            if (!flagCheckComplete && !flagPollingIntervalId) {
                 flagPollingIntervalId = setInterval(checkFlagAndStartDOMPoll, FLAG_POLLING_INTERVAL_MS);
            }
        }
    });

    // Add language string if needed
    if (window.Lampa && Lampa.Lang && !Lampa.Lang.exist('full_notext')) {
         Lampa.Lang.add({ full_notext: { en: 'No description', ru: 'Нет описания'}, });
    }

})();
