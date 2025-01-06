
$("#login-form-container").hide();
$("#register-form-container").hide();

$(document).ready(function () {
    $("#hero-section>.custom-submit-btn-div").click(function(){
      $("#login-form-container").fadeIn();
    });

    $("#login-form>svg").click(function(){
      $("#login-form-container").fadeOut();
    });


    $(".login-link").click(function(){
      $("#login-form-container").fadeOut();
      $("#register-form-container").fadeIn();
    });

    $("#register-form>svg").click(function(){
      $("#register-form-container").fadeOut();
    });

    $(".register-link").click(function(){
      $("#register-form-container").fadeOut();
      $("#login-form-container").fadeIn(); 
    });

  });