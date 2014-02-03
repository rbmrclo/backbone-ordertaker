$(function(){

  // Customer Model
  // ---------------------
  
  window.Customer = Backbone.Model.extend({

    defaults: function() {
      return {
        orders: []
      }
    },

    addOrder: function( orderId ) {
      var arr = this.get( "orders" );
      arr.push( orderId );
      this.set( { "orders": arr } );
      this.save();
      this.trigger( "add:orders", Orders.get( orderId ) );
    },

    removeOrder: function( orderId ) {
      var arr = this.get( "orders" );
      var i = 0,
        length = arr.length;
      
      for ( ; i < length; i++ ) {
        if ( arr[i] == orderId ) {
          arr.splice( i, 1 );
          this.set( { "orders": arr }, { silent: true } );
          this.save();
          this.trigger( "remove:orders", Orders.get( orderId ) );
        }
      }
    },

    getOrders: function( orderId ) {
      return _.map( this.get( "orders" ), function( orderId ) {
        return Orders.get( orderId );
      });
    }
  
  });

  // Customer Collection
  // --------------------

  window.CustomerList = Backbone.Collection.extend({
    model: Customer,

    localStorage: new Store( "customers" )
  });

  window.Customers = new CustomerList();

  // Customer Item View
  // --------------------

  window.CustomerView = Backbone.View.extend({

    tagName:  "li",

    template: _.template( $( '#customer-template' ).html() ),

    events: {
      "click span.customer-name"      : "edit",
      "click span.customer-destroy"   : "clear",
      "keypress .customer-input"      : "updateOnEnter"
    },

    initialize: function() {

      this._orderViews = {};

      $( this.el ).addClass( "customer-item" );

      this.render();
      this.model.bind( 'change', this.setText, this );
      this.model.bind( 'destroy', this.remove, this );
      this.model.bind( 'add:companies', this.addOrder, this );
      this.model.bind( 'remove:companies', this.removeOrder, this );
    },

    render: function() {
      $( this.el ).html( this.template( this.model.toJSON() ) );
      this.setText();

      var that = this;

      this.$( "ul.customer-orders" ).sortable({
        dropOnEmpty: true,
        connectWith: "ul.customer-orders",
        receive: function( event, ui ) {
          var customer = that.model;
          var id = $( ui.item[0] ).attr( "id" ); 
          var order = Orders.get( id );
          var oldCustomer = order.getCustomer();

          order.setCustomer( customer.id );
          oldCustomer.removeOrder( order.id );
          customer.addOrder( order.id );
        }
      });

      return this;
    },

    setText: function() {
      var name = this.model.get( 'name' );
      this.$( '.customer-name' ).text( name );
      this.input = this.$( '.order-input' );
      this.input.bind( 'blur', _.bind( this.close, this ) ).val( name );
    },

    edit: function() {
      $( this.el ).addClass( "editing-customer" );
      this.input.focus();
    },

    close: function() {
      this.model.save( { name: this.input.val() } );
      $( this.el ).removeClass( "editing-customer" );
    },

    updateOnEnter: function( e ) {
      if ( e.keyCode == 13 ) this.close();
    },

    addOrder: function( order ) {
      var view = new OrderView({
        model: order 
      });

      this._orderViews[order.cid] = view;
      this.$( 'ul.customer-orders' ).append( view.render().el );
    },

    removeOrder: function( order ) {
      var order = this._orderViews[order.cid];
      order.remove();
    },

    addOrders: function( order ) {
      var that = this;
      var col = this.model.getOrders(); 
      if ( col.length == 0 ) return;
      _.each( col, function( order ) {
        that.addOrder( order );
      });
    },

    remove: function() {
      $( this.el ).remove();
    },

    clear: function() {
      this.model.destroy();
    }

  });

  // Order Model
  // --------------------

  window.Order = Backbone.Model.extend({
    defaults: function() {
      return {
        paid: false,
        customer: 0,
        order: Orders.nextOrder()
      };
    },

    getCustomer: function() {
      return Customers.get( this.get( "customer" ) );
    },

    setCustomer: function( customerId ) {
      this.save( { customer: customerId }, { silent: true } );
    }
  });

  // Order Collection
  // --------------------

  window.OrderList = Backbone.Collection.extend({
    model: Order,

    localStorage: new Store( "orders" ),

    nextOrder: function() {
      if ( !this.length ) return 1;
      return this.last().get( 'order' ) + 1;
    },

    comparator: function( todo ) {
      return todo.get( 'order' );
    }

  });

  window.Orders = new OrderList();

  // Order Item View
  // --------------

  window.OrderView = Backbone.View.extend({

    tagName:  "li",

    template: _.template( $( '#order-template' ).html() ),

    events: {
      "click span.order-text"      : "edit",
      "click span.order-destroy"   : "clear",
      "click span.order-paid"      : "changePaid",
      "keypress .order-input"      : "updateOnEnter"
    },

    initialize: function() {
      $( this.el ).addClass( "order-item" );
      $( this.el ).attr( "id", this.model.id );
      this.model.bind( 'change', this.render, this );
      this.model.bind( 'destroy', this.remove, this );
    },

    render: function() {
      $( this.el ).html( this.template( this.model.toJSON() ) );
      this.setText();
      this.setPaid();
      return this;
    },

    setText: function() {
      var text = this.model.get( 'text' );
      this.$( '.order-text' ).text( text );
      this.input = this.$( '.order-input' );
      this.input.bind( 'blur', _.bind( this.close, this ) ).val( text );
    },

    edit: function() {
      $( this.el ).addClass( "editing-order" );
      this.input.focus();
    },

    close: function() {
      this.model.save( { text: this.input.val() } );
      $( this.el ).removeClass( "editing-order" );
    },

    updateOnEnter: function( e ) {
      if ( e.keyCode == 13 ) this.close();
    },

    addToCustomer: function( customer_el ) {
      $( customer_el ).append( this.el );
    },

    changePaid: function() {
      this.model.save( { paid: !this.model.get( "paid" ) } );
      this.setPaid();
    },

    setPaid: function() {
      var newPaid = this.model.get( "paid" );
      var paidElement = this.$( '.paid' );
      switch( newPaid ) {
        case true:
          paidElement.addClass( "paid" );
          break;
        case false:
          paidElement.removeClass( "paid" );
          break;
      }
    },

    remove: function() {
      $( this.el ).remove();
    },

    clear: function() {
      var customer = this.model.getCustomer();
      customer.removeOrder( this.model.id );
      this.model.destroy();
    }

  });

  // The Application
  // -----------------------

  window.AppView = Backbone.View.extend({

    el: $( "#ordertaker" ),

    events: {
      "keypress #new-order"     :  "createOrderOnEnter",
      "keypress #new-customer"  :  "createCustomerOnEnter",
      "click #data-backup"      :  "backup"
    },

    initialize: function() {
      this.orderInput        = this.$( "#new-order" );
      this.customerInput     = this.$( "#new-customer" );

      Customers.bind( 'add',   this.addCustomer, this );
      Customers.bind( 'reset', this.addCustomers, this );

      Orders.fetch();
      Customers.fetch();

      var totalCustomers = Customers.length;

      if ( totalCustomers == 0 ) {
        Customers.create( { name: "Andy"  } );
        Customers.create( { name: "Emily" } );
      }
    },

    addCustomer: function( customer ) {
      var view = new CustomerView( { model: customer } );
      this.$( "#customer-list" ).append( view.render().el );
      view.addOrders();
    },

    addCustomers: function() {
      Customers.each( this.addCustomer );
    },

    createOrderOnEnter: function( e ) {
      var text = this.orderInput.val();
      if ( !text || e.keyCode != 13 ) return;
      var initialCustomer = Customers.at( 0 );
      var order = Orders.create( { text: text } ); 
      console.log( "creating order" );
      order.setCustomer( initialCustomer.id );
      initialCustomer.addOrder( order.id );
      this.orderInput.val('');
    },

    createCustomerOnEnter: function( e ) {
      var text = this.customerInput.val();
      if ( !text || e.keyCode != 13 ) return;
      console.log( "creating customer" );
      Customers.create( { name: text } );
      this.customerInput.val('');
    },

    backup: function( e ) {
      var customers = localStorage.getItem( "customers" );
      var orders = localStorage.getItem( "orders" );
      var backup = {
        orders: JSON.parse( orders ),
        customers: JSON.parse( customers )
      };

      var data = "data:application/octet-stream",
        filename = "filename=hiree.backup,",
        header = data + ";" + filename;

      var uriContent = header + encodeURIComponent( JSON.stringify( backup ) );

      newWindow = window.open(uriContent, 'Ordertaker Backup');
    }

  });

  window.App = new AppView();

});
