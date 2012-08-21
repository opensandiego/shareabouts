var Shareabouts = Shareabouts || {};

(function(S, $){
  S.ActivityView = Backbone.View.extend({
    initialize: function() {
      var self = this;

      this.activityViews = [];

      // Infinite scroll elements and functions
      // Window where the activity lives
      this.$container = this.$el.parent();
      // How often to check for new content
      this.interval = this.options.interval || 5000;
      // How many pixel from the bottom until we look for more/older actions
      this.infiniteScrollBuffer = this.options.infiniteScrollBuffer || 25;
      // Debounce the scroll handler for efficiency
      this.debouncedOnScroll = _.debounce(this.onScroll, 600);

      // Bind click event to an action so that you can see it in a map
      this.$el.delegate('a', 'click', function(evt){
        evt.preventDefault();
        self.options.router.navigate(this.getAttribute('href'), {trigger: true});
      });

      // Check to see if we're at the bottom of the list and then fetch more results.
      this.$container.on('scroll', _.bind(this.debouncedOnScroll, this));

      // Bind collection events
      this.collection.on('add', this.onAddAction, this);
      this.collection.on('reset', this.onResetActivity, this);

      this.checkForNewActivity();
    },

    checkForNewActivity: function() {
      // Only get new activity where id is greater than the newest id
      if (this.collection.size() > 0) {
        this.collection.fetch({
          data: {after: this.collection.first().get('id')},
          add: true,
          at: 0
        });
      }

      _.delay(_.bind(this.checkForNewActivity, this), this.interval);
    },

    onScroll: function(evt) {
      var self = this,
          notFetchingDelay = 500,
          notFetching = function() { self.fetching = false; },
          shouldFetch = (this.$el.height() - this.$container.height() <=
                        this.$container.scrollTop() + this.infiniteScrollBuffer);

      if (shouldFetch && !self.fetching) {
        self.fetching = true;
        this.collection.fetch({
          data: {before: this.collection.last().get('id'), limit: 10},
          add: true,
          success: function() { _.delay(notFetching, notFetchingDelay); },
          error: function() {_.delay(notFetching, notFetchingDelay); }
        });
      }
    },

    onAddAction: function(model, collection, options) {
      this.renderAction(model, options.index);

      // TODO Only do the following if the activity instance is a place.
      this.options.places.add(model.get('data'));
    },

    onResetActivity: function(collection) {
      this.render();
    },

    renderAction: function(model, index) {
      var modelData = _.extend({
            submitter_is_anonymous: (!model.get('data').submitter_name)
          }, model.toJSON()),
          $template = ich['activity-list-item'](modelData);

      if (index >= this.$el.children().length) {
        this.$el.append($template);
      } else {
        $template
          // Hide first so that slideDown does something
          .hide()
          // Insert before the index-th element
          .insertBefore(this.$el.find('.activity-item:nth-child('+index+1+')'))
          // Nice transition into view ()
          .slideDown();

        // Just adds it with no transition
        // this.$el.find('.activity-item:nth-child('+index+1+')').before($template);
      }
    },

    render: function(){
      var self = this;

      self.$el.empty();
      self.collection.each(function(model) {
        // Handle if an existing place type does not match the list of available
        // place types.
        var placeModel = self.options.places.get(model.get('place_id')),
            placeType = self.options.placeTypes[placeModel.get('location_type')];

        if (placeType) {
          self.renderAction(model, self.collection.length);
        }
      });
      return self;
    }
  });

})(Shareabouts, jQuery);