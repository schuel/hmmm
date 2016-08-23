Router.map(function () {
	this.route('calendar', {
		path: 'calendar',
		template: 'calendar',
		data: function() { return this.params; },
		onAfterAction: function() {
			document.title = webpagename + 'Calendar';
		}
	});
});

Template.calendar.onCreated(function() {
	var instance = this;

	var filter = Filtering(EventPredicates);
	instance.filter = filter;

	// Read URL state
	instance.autorun(function() {
		var data = Template.currentData();
		var query = data.query || {};

		// Show internal events only when a group or venue is specified
		if (!query.group && !query.venue && query.internal === undefined) {
			query.internal = false;
		}

		filter
			.clear()
			.add('start', moment().startOf('week'))
			.read(query)
			.add('region', Session.get('region'))
			.done();
	});

	instance.autorun(function() {
		var filterQuery = filter.toQuery();

		var start = filter.get('start').toDate();
		var limit = filter.get('start').add(1, 'week').toDate();

		filterQuery.period = [start, limit];
		instance.eventSub = subs.subscribe('eventsFind', filterQuery);

	});
});

var updateUrl = function(event, instance) {
	var filterParams = instance.filter.toParams();
	delete filterParams.region; // HACK region is kept in the session (for bad reasons)
	var queryString = UrlTools.paramsToQueryString(filterParams);

	var options = {};
	if (queryString.length) {
		options.query = queryString;
	}

	Router.go('calendar', {}, options);
	event.preventDefault();
};

Template.calendar.helpers({
	weekday: function(day) {
		return day.format('dddd Do MMMM');
	},
	past: function() {
		return moment().isAfter(this.end);
	},
	days: function() {
		var start = Template.instance().filter.get('start');
		var i = 0;
		var days = [];
		for (; i < 7; i++) {
			days.push({
				start: moment(start).add(i, 'days'),
				end: moment(start).add(i+1, 'days')
			});
		}
		return days;
	},
	filter: function() {
		return Template.instance().filter;
	},
	startDate: function() {
		Session.get('timeLocale');
		return moment(Template.instance().filter.get('start'));
	}
});

Template.calendarDay.helpers({
	hasEvents: function() {
		var filterQuery = this.filter.toQuery();
		filterQuery.period = [this.day.start.toDate(), this.day.end.toDate()];

		return eventsFind(filterQuery).count() > 0;
	},
	events: function() {
		var filterQuery = this.filter.toQuery();
		filterQuery.period = [this.day.start.toDate(), this.day.end.toDate()];

		return eventsFind(filterQuery);
	},
	calendarDay: function(day) {
		Session.get('timeLocale');
		return moment(day.toDate()).format('dddd, Do MMMM');
	},
	eventsReady: function() {
		var instance = Template.instance();
		return instance.parentInstance().eventSub.ready();
	}
});

Template.calendar.onCreated(function() {
	var instance = this;

	var filter = Filtering(EventPredicates);
	instance.filter = filter;

	// Read URL state
	instance.autorun(function() {
		var data = Template.currentData();
		var query = data.query || {};

		// Show internal events only when a group or venue is specified
		if (!query.group && !query.venue && query.internal === undefined) {
			query.internal = false;
		}

		filter
			.clear()
			.add('start', moment().startOf('week'))
			.read(query)
			.add('region', Session.get('region'))
			.done();
	});

	instance.autorun(function() {
		var filterQuery = filter.toQuery();

		var start = filter.get('start').toDate();
		var limit = filter.get('start').add(1, 'week').toDate();

		filterQuery.period = [start, limit];
		instance.eventSub = subs.subscribe('eventsFind', filterQuery);

	});
});

var mvDateHandler = function(amount, unit) {
	return function(event, instance) {
		var start = instance.filter.get('start');
		var weekCorrection = unit == "week"? 0 : 1;
		if (amount < 0) {
			start.add(amount, unit).startOf('week');
		} else {
			start.add(amount, unit).add(weekCorrection, 'week').startOf('week');
		}
		instance.filter.add('start', start).done();
		updateUrl(event, instance);
		return false;
	};
};

Template.calendar.events({
	'click .js-next-week':      mvDateHandler( 1, 'week'),
	'click .js-previous-week':  mvDateHandler(-1, 'week'),
	'click .js-next-month':     mvDateHandler( 1, 'month'),
	'click .js-previous-month': mvDateHandler(-1, 'month'),
	'click .js-next-year':      mvDateHandler( 1, 'year'),
	'click .js-previous-year':  mvDateHandler(-1, 'year'),
});

Template.calendarNavigation.helpers({
	endDateTo: function(date) {
		return moment(date).add(6, 'days');
	}
});
