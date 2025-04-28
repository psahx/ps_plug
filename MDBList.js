// == Lampa Plugin: Interface Patcher - Step 3.1 ==
// Purpose: Use MutationObserver to detect CUB interface rendering and apply
//          initial DOM patches (remove old rating, add placeholders). NO fetcher logic.
// Strategy: Observe main layer, patch DOM on element appearance.
// Version: 3.1 (MutationObserver Init + DOM Patch)
(function () { // Use standard IIFE
    'use strict';

    const PLUGIN_NAME = "InterfacePatcher Step 3.1 (MutationObserver)";

    // --- Lampa Readiness Check ---
    if (!window.Lampa || !window.Lampa.Listener || !window.Lampa.Template || !window.Lampa.Storage || !window.Lampa.Api || !window.Lampa.Utils || !window.Lampa.Lang || !window.Lampa.Layer || !window.$) {
        console.error(`${PLUGIN_NAME}: Required Lampa components ($, Layer) missing.`);
        return; // Cannot proceed without Layer or jQuery
    } else {
        console.log(`${PLUGIN_NAME}: Base Lampa components found.`);
    }

    // --- Constants ---
    const STYLE_ID = 'patched_new_interface_style_step3'; // New ID for this approach
    const TARGET_DETAILS_SELECTOR = '.new-interface-info__details'; // Element to patch
    const TARGET_INFO_SELECTOR = '.new-interface-info'; // Parent element marker
    const ORIGINAL_TMDB_RATING_TEXT = 'TMDB'; // Text inside the original rating box's second div
    const PATCHED_FLAG = 'data-interface-patched-step3-1'; // Attribute to mark processed elements

    // --- Logo URLs ---
    const imdbLogoUrl = 'https://psahx.github.io/ps_plug/IMDb_3_2_Logo_GOLD.png';
    const tmdbLogoUrl = 'https://psahx.github.io/ps_plug/TMDB.svg';
    const rtFreshLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes.svg';
    // const rtRottenLogoUrl = '...'; // Not needed yet for placeholder

    // --- CSS Injection Function ---
    function injectCSS() {
        console.log(`${PLUGIN_NAME}: Attempt CSS inject (Style ID: ${STYLE_ID})...`);
        try {
            $('style[data-id^="patched_new_interface_style_step"]').remove(); // Cleanup previous step styles
            if ($('style[data-id="' + STYLE_ID + '"]').length) { return; }
            const css = `<style data-id="${STYLE_ID}">/* ... FULL CSS content as provided before ... */ .new-interface-info{height:22.5em;}.new-interface .full-start__rate{font-size:1.3em;margin-right:0em;display:inline-flex;align-items:center;vertical-align:middle;background-color:rgba(255,255,255,0.12);padding:0 0.2em 0 0;border-radius:0.3em;gap:0.5em;overflow:hidden;height:auto;}.new-interface .full-start__rate>div{font-weight:normal;font-size:1em;justify-content:center;background-color:rgba(0,0,0,0.4);color:#fff;padding:0.1em 0.3em;border-radius:0.3em;line-height:1.3;order:1;display:flex;align-items:center;flex-shrink:0;}.rt-rating-item>div.rt-score{padding-left:1.2em;padding-right:1.2em;}.placeholder-value{color:rgba(255,255,255,0.6);}.rating-logo{height:1.1em;width:auto;max-width:75px;vertical-align:middle;order:2;line-height:0;flex-shrink:0;}.tmdb-logo{height:.9em;}.rt-logo{height:1.1em;}.new-interface .card--small.card--wide{width:18.3em;}.new-interface-info{position:relative;padding:1.5em;}.new-interface-info__body{width:80%;padding-top:1.1em;}.new-interface-info__head{color:rgba(255,255,255,0.6);margin-bottom:1em;font-size:1.3em;min-height:1em;}.new-interface-info__head span{color:#fff;}.new-interface-info__title{font-size:4em;font-weight:600;margin-bottom:.3em;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical;margin-left:-0.03em;line-height:1.3;}.new-interface-info__details{margin-bottom:1.6em;display:flex;align-items:center;flex-wrap:wrap;min-height:1.9em;font-size:1.1em;gap:.5em 0;}.new-interface-info__split{margin:0 1em;font-size:.7em;display:inline-block;vertical-align:middle;}.new-interface-info__description{font-size:1.2em;font-weight:300;line-height:1.5;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:4;line-clamp:4;-webkit-box-orient:vertical;width:70%;}.new-interface .card-more__box{padding-bottom:95%;}.new-interface .full-start__background{height:108%;top:-6em;}.new-interface .card__promo{display:none;}.new-interface .card.card--wide+.card-more .card-more__box{padding-bottom:95%;}.new-interface .card.card--wide .card-watched{display:none!important;}body.light--version .new-interface-info__body{width:69%;padding-top:1.5em;}body.light--version .new-interface-info{height:25.3em;}body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view{animation:animation-card-focus .2s} body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view{animation:animation-trigger-enter .2s forwards}</style>`;
            Lampa.Template.add(STYLE_ID, css); $('body').append(Lampa.Template.get(STYLE_ID, {}, !0));
            console.log(`${PLUGIN_NAME}: CSS Injected successfully.`);
        } catch (e) { console.error(`${PLUGIN_NAME}: CSS injection error`, e); }
    }

    // --- DOM Patching Logic ---
    function performDOMChanges(detailsElement) {
        // Check if already patched
        if (!detailsElement || detailsElement.hasAttribute(PATCHED_FLAG)) {
            return;
        }
        console.log(`%c${PLUGIN_NAME}: Applying DOM patches to:`, 'color: blue;', detailsElement);
        const $details = $(detailsElement);

        // 1. Find and remove the original TMDB rating box more reliably
        let originalVote = '---';
        let originalTmdbElement = null;
        $details.find('.full-start__rate').each(function() {
            const $divs = $(this).find('div');
            // Check if the second div contains the exact text 'TMDB'
            if ($divs.length === 2 && $divs.eq(1).text().trim() === ORIGINAL_TMDB_RATING_TEXT) {
                originalVote = $divs.eq(0).text().trim();
                originalTmdbElement = this; // Element to remove
                return false; // Stop loop
            }
        });

        if (originalTmdbElement) {
             console.log(`${PLUGIN_NAME}: Removing original TMDB box. Captured vote: ${originalVote}`);
             $(originalTmdbElement).remove();
        } else {
             console.warn(`${PLUGIN_NAME}: Original TMDB rating box not found for removal.`);
        }


        // 2. Create placeholder HTML
        const imdbRatingHtml = `<div class="full-start__rate imdb-rating-item"><div class="placeholder-value">-.--</div><img src="${imdbLogoUrl}" class="rating-logo imdb-logo" alt="IMDB" draggable="false"></div>`;
        const tmdbRatingHtml = `<div class="full-start__rate tmdb-rating-item"><div>${originalVote}</div><img src="${tmdbLogoUrl}" class="rating-logo tmdb-logo" alt="TMDB" draggable="false"></div>`;
        const rtRatingHtml = `<div class="full-start__rate rt-rating-item"><div class="placeholder-value rt-score">--%</div><img src="${rtFreshLogoUrl}" class="rating-logo rt-logo" alt="RT Status" draggable="false"></div>`;

        // 3. Prepend new placeholders (order: IMDb, TMDB, RT)
        $details.prepend(rtRatingHtml).prepend(tmdbRatingHtml).prepend(imdbRatingHtml);
        console.log(`${PLUGIN_NAME}: Prepended rating placeholders.`);

        // 4. Adjust separators
        $details.find('.imdb-rating-item + .new-interface-info__split, .tmdb-rating-item + .new-interface-info__split, .rt-rating-item + .new-interface-info__split').remove();
        $details.find('.full-start__rate').each(function() {
            const $currentItem = $(this); const $nextElement = $currentItem.next();
            if ($nextElement.length && !$nextElement.hasClass('full-start__rate') && !$nextElement.hasClass('new-interface-info__split')) {
                 if($currentItem.hasClass('imdb-rating-item') || $currentItem.hasClass('tmdb-rating-item') || $currentItem.hasClass('rt-rating-item')) {
                     $('<span class="new-interface-info__split">&#9679;</span>').insertAfter($currentItem);
                 }
            }
        });
        $details.find('.new-interface-info__split + .new-interface-info__split').remove();
        if ($details.children().last().hasClass('new-interface-info__split')) { $details.children().last().remove(); }
        console.log(`${PLUGIN_NAME}: Adjusted separators.`);

        // 5. Mark as patched
        detailsElement.setAttribute(PATCHED_FLAG, 'true');
        console.log(`%c${PLUGIN_NAME}: DOM patching complete for this element.`, 'color: green;');
    }

    // --- MutationObserver Logic ---
    let observer = null; // Holds the observer instance
    let observerTargetNode = null; // Holds the DOM node being observed

    // Callback function to execute when mutations are observed
    const mutationCallback = function(mutationsList, obs) {
        // console.debug(`${PLUGIN_NAME}: MutationObserver callback triggered.`);
        let processed = false; // Flag to process only once per callback invocation if needed

        for (const mutation of mutationsList) {
            // Option 1: Check efficiently if added nodes contain our target's parent
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) { // Check if it's an Element
                         // Check if the added node itself is or contains the target details element
                         const $detailsElement = $(node).is(TARGET_INFO_SELECTOR)
                            ? $(node).find(TARGET_DETAILS_SELECTOR)
                            : $(node).find(TARGET_DETAILS_SELECTOR);

                         $detailsElement.each(function() {
                             if (!this.hasAttribute(PATCHED_FLAG)) {
                                 console.debug(`${PLUGIN_NAME}: Target details element found within added node.`);
                                 performDOMChanges(this);
                                 processed = true;
                             }
                         });
                    }
                }
            }
             // Optimization: If we found and processed via addedNodes, maybe skip broader check?
             // if (processed) break; // Uncomment if broad check is too slow / causes issues

             // Option 2: Broader check if target appeared indirectly (less efficient but catches more cases)
             if (!processed && observerTargetNode) {
                 // Find target elements that haven't been patched yet within the observed target
                 $(observerTargetNode).find(TARGET_DETAILS_SELECTOR + ':not([' + PATCHED_FLAG + '])').each(function() {
                     console.debug(`${PLUGIN_NAME}: Target details element found via broader check.`);
                     performDOMChanges(this);
                     processed = true; // Mark as processed for this callback run
                 });
             }

             // If we processed something in this mutation record, we can stop checking other records in this batch
             if (processed) break;
        }
    };

    // Function to initialize and start the observer
    function initMutationObserver() {
        // Select the target node to observe. Lampa.Layer.main() is usually stable.
        // Fallback to document body if Layer.main() isn't available at init.
        observerTargetNode = Lampa.Layer.main() || document.body;
        console.log(`${PLUGIN_NAME}: Starting MutationObserver. Target Node:`, observerTargetNode);

        if (!observerTargetNode) {
            console.error(`${PLUGIN_NAME}: Could not find suitable target node to observe.`);
            return;
        }

        // Disconnect previous observer if re-initializing (safety)
        if (observer) {
            console.log(`${PLUGIN_NAME}: Disconnecting previous observer.`);
            observer.disconnect();
        }

        // Create a new observer instance linked to the callback function
        observer = new MutationObserver(mutationCallback);

        // Configuration of the observer:
        const config = {
            childList: true,  // Observe additions/removals of direct children
            subtree: true     // Observe all descendants of the target node
        };

        // Start observing the target node for configured mutations
        observer.observe(observerTargetNode, config);
        console.log(`${PLUGIN_NAME}: MutationObserver is now watching for DOM changes.`);

        // ** Initial Scan **: Check if the element already exists right after starting observer
        console.log(`${PLUGIN_NAME}: Performing initial scan for target element...`);
        $(observerTargetNode).find(TARGET_DETAILS_SELECTOR + ':not([' + PATCHED_FLAG + '])').each(function() {
            console.log(`${PLUGIN_NAME}: Found target element during initial scan.`);
            performDOMChanges(this);
        });
    }

    // --- Plugin Start ---
    console.log(`${PLUGIN_NAME}: Script loaded.`);
    Lampa.Listener.follow('app', (e) => {
        if (e.type == 'ready') {
            console.log(`${PLUGIN_NAME}: App ready event received.`);
            injectCSS();
            // Initialize the MutationObserver after app is ready and CSS is injected
            initMutationObserver();
        }
    });

    // Add language string if needed
    if (window.Lampa && Lampa.Lang && !Lampa.Lang.exist('full_notext')) {
         Lampa.Lang.add({ full_notext: { en: 'No description', ru: 'Нет описания'}, });
    }

})(); // Standard IIFE end
