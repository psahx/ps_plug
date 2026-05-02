// == Lampa Secret Data Sniffer ==
(function () {
    'use strict';

    console.log("🕵️‍♂️ Sniffer ready. Go click a narrow card.");

    $(document).on('click', '.card', function(e) {
        console.log("--- 🎯 NARROW CARD CLICKED ---");
        console.log("Title on screen:", $(this).find('.card__title').text());
        
        // Let's check the standard places Lampa hides data objects
        console.log("1. Native DOM Data (this.data):", this.data);
        console.log("2. jQuery Data Object:", $(this).data());
        
        // If it's not in the standard places, list every custom property attached to the element
        console.log("3. All custom properties attached to this element:", Object.keys(this));
    });

})();
