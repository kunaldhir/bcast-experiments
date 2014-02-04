// Sketch of browsercast / revealjs integration.
(function () {

    // TODO have a way of starting record-mode.
    playBrowserCast();

    function SlideCue(time, slideIndex) {
        this.time = time;
        this.slideIndex = slideIndex;
    }

    SlideCue.prototype.focus = function () {
        Reveal.navigateTo(this.slideIndex);
    };

    function FragmentCue(time, slideIndex, fragmentIndex) {
        this.time = time;
        this.slideIndex = slideIndex;
        this.fragmentIndex = fragmentIndex;
    }

    FragmentCue.prototype.focus = function () {
        var slide, slideFragments, targetFragment;
        slide = Reveal.getSlide(this.slideIndex);
        if (Reveal.getIndices()['h'] !== this.slideIndex) {
            Reveal.slide(this.slideIndex);
        }
        slideFragments = slide.getElementsByClassName('fragment');
        targetFragment = slideFragments[this.fragmentIndex];
        targetFragment.classList.add("visible");
        targetFragment.classList.add("current-fragment");
    };

    function getSectionFragmentCues(section, slideIndex) {
        var fragmentTags, fragmentTag, cue, cueTime, fragmentCues, i;
        fragmentTags = section.getElementsByClassName('fragment');

        fragmentCues = [];
        for (i = 0; i < fragmentTags.length; i += 1) {
            fragmentTag = fragmentTags[i];
            cueTime = parseCueTime(fragmentTag);
            cue = new FragmentCue(
                cueTime,
                slideIndex,
                i
            );
            fragmentCues.push(cue);
        }
        return fragmentCues;
    }

    function parseCueTime(tag) {
        return parseFloat(tag.attributes['data-bccue'].value);
    }

    function getSlideCues() {
        var slides, slideCues, cue, cueTime, subCues;
        // Get a list of the slides and their cue times.
        slides = document.getElementsByTagName('section');
        slideCues = [];
        for (i = 0; i < slides.length; i += 1) {
            if (typeof slides[i].attributes['data-bccue'] !== 'undefined') {
                cueTime = parseCueTime(slides[i]);
                cue = new SlideCue(cueTime, i);
                slideCues.push(cue);
                subCues = getSectionFragmentCues(slides[i], i);
                slideCues = slideCues.concat(subCues);
            }
        }
        return slideCues;
    }

    // Use the audio timeupdates to drive existing slides.
    function playBrowserCast() {
        var audio, slideCues;

        slideCues = getSlideCues();

        // Look for the browsercast audio element.
        audio = document.getElementById('browsercast-audio');

        // When the time updates, see if it's a good time to navigate.
        audio.addEventListener('timeupdate', function () {
            var time, i, validCues = [], lastValidCue;
            time = this.currentTime;
            for (i = 0; i < slideCues.length; i++) {
                if (slideCues[i].time <= time) {
                    validCues.push(slideCues[i]);
                }
            }
            lastValidCue = validCues[validCues.length-1];
            if (typeof lastValidCue !== 'undefined') {
                lastValidCue.focus();
            }
        });

        // TODO this shouldn't run if the timeupdate handler is changing
        // the slide; otherwise we're constantly seeking in the audio
        // for no good reason.
        Reveal.addEventListener('slidechanged', function (event) {
            var cueTimeRaw, cueTime, indexh, newSlide;
            // For some reason event.currentSlide refers to the slide we just left instead of the one we're navigating to.
            indexh = event.indexh;
            newSlide = Reveal.getSlide(indexh);
            cueTimeRaw = newSlide.attributes['data-bccue'].value;
            cueTime = parseFloat(cueTimeRaw);
            audio.currentTime = cueTime;
            audio.play();
        });

        // Start the 'cast!
        audio.play();
    }

    // Start recording a 'cast
    // In the end you can get the slide HTML with the cue attributes set
    // by running:
    //        browsercastRecorder.getHTMLSlides()
    // in the Javascript console.
    //
    // Press "Left" on the first slide to start recording.
    function recordBrowserCast() {
        Reveal.navigateTo(0);
        function CuePointTracker() {
            this.currentIndex = 0; // assume starting on first slide. not great.
            this.cuePoints = [];
            this.addCuePoint = function (ts) {
                var cp = {
                    ts: ts,
                    index: this.currentIndex
                };
                this.cuePoints.push(cp);
                this.currentIndex += 1;
            };

            this.getStartTS = function () {
                var first = this.cuePoints[0];
                return first.ts;
            };

            this.getHTMLSlides = function () {
                var slides, src, i, start, slideDiv;
                start = this.getStartTS();
                slides = document.getElementsByTagName('section');
                for (i = 0; i < this.cuePoints.length; i += 1) {
                    slides[i].attributes['data-bccue'].value = (this.cuePoints[i].ts - start)/1000.0;

                }
                slideDiv = document.getElementsByClassName('slides')[0];
                return slideDiv.innerHTML;
            };
        }

        var tracker = new CuePointTracker();
        window.browsercastRecorder = tracker;

        document.addEventListener('keydown', function (event) {
            if (event.keyIdentifier === 'Left' || event.keyIdentifier === 'Right') {
                var ts = event.timeStamp;
                tracker.addCuePoint(ts);
            }
        });
    }

})();
