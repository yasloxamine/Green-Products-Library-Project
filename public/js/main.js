
$("#login-form-container").hide();

$(document).ready(function () {
    $("#hero-section>.custom-submit-btn-div").click(function(){
      $("#login-form-container").fadeIn();
    });

    $("#login-form>svg").click(function(){
      $("#login-form-container").fadeOut();
    });

  });