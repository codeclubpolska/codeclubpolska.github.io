(function() {

window.CodeClubWorld = {};

CodeClubWorld.api_token = 'cf2915583866ac3913e138e7ee2826dcb6fff84bea0b86a2eb0010058130c4a4';
CodeClubWorld.country_code = 'pl';
CodeClubWorld.api = 'https://api.codeclubworld.org';
CodeClubWorld.api_version = '2';

CodeClubWorld.makeMap = function() {
  var el = document.getElementById('map');
  if (!el) return;

  $.ajax({
      method      : 'GET',
      url         : CodeClubWorld.api + '/clubs?in_country=' + CodeClubWorld.country_code,
      contentType : 'application/json',
      headers     : { 'Authorization': 'Bearer ' + CodeClubWorld.api_token, 'Accept': 'application/vnd.codeclubworld.v'+CodeClubWorld.api_version }
  })
  .done(function(data) {
    var clubs = data,
        markers = [];

    var map = new google.maps.Map(el, {
      zoom: 6,
      center: new google.maps.LatLng(52.0632924, 19.7688889),
      scrollwheel: false,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });

      var plClubsCounter = clubs.length;

    $.each(clubs, function(i, club) {
      var loc = club.venue.address;

      if (!loc) return;

      var lat = loc.latitude,
          lng = loc.longitude;

      if (lat === null || lng === null) return;

      var latLng = new google.maps.LatLng(lat, lng),
          marker = new google.maps.Marker({
            position: latLng,
            icon: '/img/map/marker.png'
          });

      markers.push(marker);

      google.maps.event.addListener(marker, 'click', function() {
        var infobox = CodeClubWorld.infobox;

        infobox.close();

        var content = [];

        content.push('<h5 class="name">' + club.venue.name  +'</h5>');

        if (club.venue.address.city) {
          content.push('<p class="city">' + club.venue.address.city + '</p>');
        }

        if (club.venue.url) {
          var venueUrl = ensureHTTP(club.venue.url);
          content.push(
            '<a class="website" href="' + venueUrl + '">' + venueUrl + '</a>'
          );
        }

        if (club.contact && club.contact.skype) {
          content.push(
            '<a class="skype" href="skype:' + club.contact.skype + '">' +
              'Skype: ' + club.contact.skype +
            '</a>'
          );
        }

        content = content.join('');

        infobox.setContent(content);
        infobox.open(map, marker);
      });
    });

    $('.counter').text(plClubsCounter);

    var mcOptions = {
      gridSize: 30,
      styles: [{
        textColor: 'white',
        url: '/img/map/cluster.png',
        height: 42,
        width: 42
      }, {
        textColor: 'white',
        url: '/img/map/cluster.png',
        height: 42,
        width: 42
      }, {
        textColor: 'white',
        url: '/img/map/cluster.png',
        height: 42,
        width: 42
      }]
    };

    var markerCluster = new MarkerClusterer(map, markers, mcOptions);
  });
}

CodeClubWorld.infobox = new InfoBox({
  disableAutoPan: false,
  maxWidth: 150,
  pixelOffset: new google.maps.Size(-140, -250),
  zIndex: null,
  boxStyle: {
    background: '#fff',
    width: '280px',
    height: '200px',
    padding: '0 10px'
  },
  infoBoxClearance: new google.maps.Size(1, 1),
  closeBoxURL: '/img/map/close.png',
  closeBoxMargin: '10px 0 0 0'
});

CodeClubWorld.startClubButton = function() {
  $('.start-club a').click(function() {
     $('html, body').animate({
         scrollTop: $('#register').offset().top - 20
     }, 700);
  });
}

CodeClubWorld.interceptForm = function() {
  var form = $('#register form');

  form.parsley({
    successClass: 'success',
    errorClass: 'error'
  })

  form.parsley('addListener', {
    onFormSubmit: function(formIsValid, event, parsleyForm) {
      event.preventDefault();

      if (formIsValid) {
        var data = form.serializeHash();
        delete data.contact.agreed;

        if (data.venue.country.code === 'GB') {
          CodeClubWorld.registerWithUK(data);
        } else {
          CodeClubWorld.registerWithAPI(data);
        }
      }
    }
  });
}

CodeClubWorld.registerWithAPI = function(data) {
  var data = sanitizeDataForAPI(data);

  $.ajax({
    type        : 'POST',
    url         : CodeClubWorld.api + '/clubs',
    data        : JSON.stringify(data),
    dataType    : 'json',
    contentType : 'application/json',
    headers     : { 'Authorization': 'Bearer ' + CodeClubWorld.token }
  })
  .done(CodeClubWorld.apiDone)
  .fail(CodeClubWorld.apiFail);
}

CodeClubWorld.apiDone = function() {
  location.href = '/witaj';
}

CodeClubWorld.apiFail = function(response, status, error) {
  var errors = response.responseJSON.errors;

  $('#register').find('.alert, .api-error').remove();

  $('#register').prepend(
    '<div class="panel alert">' +
      '<strong>Unable to register your club</strong>' +
    '</div>'
  );

  if (errors['venue.__all__'] === 'Could not geolocate venue') {
    $('[name="venue[address_1]"]').before(
      '<p class="api-error">Could not locate venue, please double-check address:</p>'
    );
  }
}

CodeClubWorld.registerWithUK = function(data) {
  var params = $.param(data);
  window.open('http://codeclub.org.uk/quick-registrations/new?' + params);
}

CodeClubWorld.customPlaceholders = function() {
  function hideLabel() {
    $(this).closest('.custom-placeholder').find('label').hide();
  }

  function showIfEmpty() {
    if ($(this).val() || $(this).find('option:selected').val()) return;
    $(this).closest('.custom-placeholder').find('label').show();
  }

  var fields = $('.custom-placeholder');

  fields
    .find('input, textarea, select')
      .on('keydown change', hideLabel)
      .on('blur keyup', showIfEmpty)
      .each(hideLabel).each(showIfEmpty);
};

CodeClubWorld.trackMaterialClicks = function() {
  $(document).on('click', '.materials .button', function(e) {
    if (!window.ga) return;

    e.preventDefault();

    var a = $(e.target);
    var href = a.prop('href');
    var label = a.text();

    window.ga('send', 'event', 'Materials', 'click', label);

    setTimeout(function() { location = href }, 100);
  });
}

function addressToString(data) {
  return unique(removeBlanks([
    data.name,
    data.address_1,
    data.address_2,
    data.region,
    data.city,
    data.postcode
  ])).join(', ');
}

function isBlank(object) {
  return object == null || !!(object.match && object.match(/^\s*$/));
}

function removeBlanks(array) {
  var result = [];
  for (var i in array) {
    var item = array[i];
    if (!isBlank(item)) result.push(item);
  }
  return result;
}

function unique(array) {
  var result = [];
  for (var i in array) {
    var item = array[i];
    if (result.indexOf(item) === -1) result.push(item);
  }
  return result;
}

function ensureHTTP(str) {
  return str.match(/^https?:\/\//) ? str : 'http://' + str;
}

function sanitizeDataForAPI(input) {
  var output = $.extend(true, {}, input);

  if (isBlank(output.venue.website)) {
    delete output.venue.website;
  } else {
    output.venue.website = ensureHTTP(output.venue.website);
  }

  return output;
}

$(function() {
  CodeClubWorld.makeMap();
  CodeClubWorld.startClubButton();
  CodeClubWorld.customPlaceholders();
  CodeClubWorld.interceptForm();
  CodeClubWorld.trackMaterialClicks();
});

})();
