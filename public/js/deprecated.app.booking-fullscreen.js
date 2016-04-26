/*global $*/
$(document).ready(function() {
    window.fp = $('#fullpage').fullpage({
        //Navigation
        menu: '#menu',
        lockAnchors: false,
        anchors: [
            //'question1', 'question2', 'question3', 'question4', 'question5', 'question6', 'question7'
            , 'diags'
            //, 'calendar-datepicker'
            , 'calendar-timepicker', 'confirm-and-save'
            //, 'confirm-order'
        ],
        navigation: true,
        navigationPosition: 'right',
        navigationTooltips: [
            //'You Sell or Rent', 'House or Apartment', 'Size', 'Date permis de construire', 'Write your address', 'What about gas installation?', 'Electricity Installation?'
            , 'Select diags' //, 'Choice a day'
            , 'Pick a time', 'Confirmation and Save'
        ],
        showActiveTooltip: true,
        slidesNavigation: true,
        slidesNavPosition: 'bottom',

        //Scrolling
        css3: false,
        scrollingSpeed: 700,
        autoScrolling: true,
        fitToSection: true,
        fitToSectionDelay: 500,
        scrollBar: false,
        easing: 'easeInOutCubic',
        easingcss3: 'ease',
        loopBottom: false,
        loopTop: false,
        loopHorizontal: true,
        continuousVertical: false,
        normalScrollElements: '.element1, .element2',
        scrollOverflow: false,
        touchSensitivity: 99999999,
        normalScrollElementTouchThreshold: 5,

        //Accessibility
        keyboardScrolling: false,
        animateAnchor: true,
        recordHistory: true,

        //Design
        controlArrows: false,
        verticalCentered: true,
        resize: false,
        //sectionsColor: ['#ccc', '#fff'],
        paddingTop: '3em',
        paddingBottom: '10px',
        fixedElements: '#header, .footer',
        responsiveWidth: 0,
        responsiveHeight: 0,

        //Custom selectors
        sectionSelector: '.section',
        slideSelector: '.slide',

        //events
        onLeave: function(index, nextIndex, direction) {},
        afterLoad: function(anchorLink, index) {},
        afterRender: function() {},
        afterResize: function() {},
        afterSlideLoad: function(anchorLink, index, slideAnchor, slideIndex) {},
        onSlideLeave: function(anchorLink, index, slideIndex, direction, nextSlideIndex) {}
    });
});
