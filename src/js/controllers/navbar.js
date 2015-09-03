/**
 * NAVBAR
 *
 * The navbar controller manages the bar at the top of the screen.
 */

var Amount = ripple.Amount,
    rewriter = require('../util/jsonrewriter');

var module = angular.module('navbar', []);

module.controller('NavbarCtrl', ['$scope', '$element', '$compile', 'rpId',
                                 'rpNetwork', '$location',
                                 function ($scope, el, $compile, $id,
                                           network, $location)
{
  var queue = [];
  var tickInterval = 4000;
  var tickUpcoming = false;

  // Activate #status panel
  $scope.toggle_secondary = function () {
    $scope.show_secondary = !$scope.show_secondary;
  };

  function serverStatusUpdate() {
    $scope.fee = network.remote.createTransaction()._computeFee();

    if (!$scope.connected && $scope.userCredentials.username) {
      $scope.serverStatus = 'disconnected';
    }
    else if ($scope.connected && $scope.fee) {
      if ((parseFloat(ripple.Amount.from_json($scope.fee).to_human()) > parseFloat(Options.low_load_threshold)) && (parseFloat($scope.fee) < parseFloat(Options.max_tx_network_fee))) {
        $scope.serverLoad = 'mediumLoad';
        $scope.serverStatus = 'mediumLoad';
      } else if (parseFloat($scope.fee) >= parseFloat(Options.max_tx_network_fee)) {
        $scope.serverLoad = 'highLoad';
        $scope.serverStatus = 'highLoad';
      } else {
        $scope.serverLoad = '';
        $scope.serverStatus = 'lowLoad';
      }
    }
    else {
      $scope.serverStatus = 'connected';
    }
  }

  $scope.$watch('connected', serverStatusUpdate, true);

  // Username
  $scope.$watch('userCredentials', serverStatusUpdate, true);

  $scope.$on('$netConnected', function(e) {
    setConnectionStatus(true);
  });

  $scope.$on('$netDisconnected', function(e) {
    setConnectionStatus(false);
  });

  var updateNotifications = function() {
    if (!$scope.onlineMode) {
      $scope.notifications = "";
    }
    else if ($scope.events) {
      $scope.notifications = $scope.events.slice(0,10);
    }
  };

  $scope.$on('$eventsUpdate', updateNotifications);
  $scope.$watch('onlineMode', updateNotifications, true);

  /**
   * Marks all the notifications as seen.
   */
  $scope.read = function() {
    // don't do anything if account is unfunded
    if (!$scope.notifications.length)
      return;

    var lastTxDate = $scope.notifications[0].date;

    if ($scope.unseen > 0) {
      $scope.unseen = 0;
    }

    if (($scope.userBlob.data.lastSeenTxDate || 0) < lastTxDate) {
      // Remember last seen date
      $scope.userBlob.set("/lastSeenTxDate", lastTxDate);

      // Reset the counter
      $scope.unseen = $scope.unseenNotifications.count;
      $scope.unseenNotifications.count = 0;

      // Set seen for all the events
//      _.each($scope.events, function(event){
//        event.unseen = false;
//      })
    }
  };

  /**
   * Graphically display a network-related notifications.
   *
   * This function does no filtering - we assume that any transaction that makes
   * it here is ready to be rendered by the notification area.
   *
   * @param {Object} e Angular event object
   * @param {Object} tx Transaction info, returned from JsonRewriter#processTxn
   */

// VH: Hiding this for now.
//  $scope.$on('$appTxNotification', function (e, tx) {
//    var $localScope = $scope.$new();
//    $localScope.tx = tx.tx;
//
//    var html = tplAccount($localScope);
//
//    if (html.length) {
//      var msg = $compile(html)($localScope);
//      enqueue(msg);
//    }
//  });

  function setConnectionStatus(connected) {
    $scope.connected = !!connected;
  }

  // A notification might have been queued already before the app was fully
  // initialized. If so, we display it now.
  if (queue.length) tick();

  var notifyEl = $('<div>').attr('id', 'notification').insertAfter(el);

  // Default to disconnected
  setTimeout(function() {
    setConnectionStatus($scope.connected);
  }, 1000 * 3);

  /**
   * Add the status message to the queue.
   */
  function enqueue(msg)
  {
    queue.push(msg);
    if (!tickUpcoming) {
      setImmediate(tick);
    }
  }

  /**
   * Proceed to next notification.
   */
  var prevEl = null;
  function tick()
  {
    if (prevEl) {
      // Hide notification box
      prevEl.removeClass('active');
      var prevElRef = prevEl;
      setTimeout(function () {
        prevElRef.remove();
      }, 1000);
      prevEl = null;
    }

    tickUpcoming = false;
    if (queue.length) {
      // Ensure secondary currencies pulldown is closed
      $scope.$apply(function() {
        $scope.show_secondary = false;
      });

      // Show next status message
      var next = queue.shift();

      var el = $(next);
      el.addClass('notification');
      el.appendTo(notifyEl);
      setImmediate(function () {
        el.addClass('active');
      });

      prevEl = el;

      tickUpcoming = true;
      setTimeout(tick, tickInterval);
    }
  }

  updateNotifications();

  // Testing Hooks
  this.setConnectionStatus = setConnectionStatus;
  this.enqueue             = enqueue;
  this.tick                = tick;
}]);
