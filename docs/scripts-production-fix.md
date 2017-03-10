
(function(s,api){
var template = '<div class="diags-bg">';
        template += '<div class="diags-content container diags-selection padding-none">';
        template += '<div class="row diags-bg-block-40 hidden-xs"></div>';
        template += '<div class="row diag-row padding-top-three">';
        template += '__HTML__';
        template += '</div>';
        template += '</div>';
        template += '<div class="row diags-bg-block-40 hidden-xs"></div>';
        template += '</div>';
    /*
    var _codes = ['Paris','Nice','Dijon','Toulouse','Rennes','Lyon','Bordeaux','Tours','Grenoble','Angers','Creteil','Saint-Étienne','Lille','Melun','Nantes','Strasbourg'];
    */
    //_codes = ['Strasbourg','Nantes'];
    var _codes = ['Paris','Nice','Dijon','Toulouse','Rennes','Lyon','Bordeaux','Tours','Grenoble','Angers','Creteil','Saint-Étienne','Lille','Melun'];
    function iterate(){
        if(_codes.length==0){
            return console.log('FINISH');
        }
        var city = _codes[0];
        var payload = {
            code:"DIAGNOSTICS_"+city.toUpperCase(),
            template:template,
            content:"%3Cdiv%20class%3D%22row%22%3E%0A%20%20%20%20%3Cdiv%20class%3D%22col-lg-7%22%3E%0A%20%20%20%20%20%20%20%20%3Ch1%3EDiagnostic%20immobilier%20%26agrave%3B%20"+city+"%3C%2Fh1%3E%0A%0A%20%20%20%20%3C%2Fdiv%3E%0A%20%20%20%20%3Cdiv%20class%3D%22col-lg-5%22%3E%0A%20%20%20%20%20%20%20%20%3Ch2%3ERDV%20Diagnostic%20en%20ligne%3Ciframe%20class%3D%22booking-iframe%22%20src%3D%22https%3A%2F%2Fwhite-house-78-javoche.c9users.io%2Fiframe%22%20width%3D%22300%22%20height%3D%22150%22%3E%3C%2Fiframe%3E%3C%2Fh2%3E%0A%20%20%20%20%3C%2Fdiv%3E%0A%3C%2Fdiv%3E",
            description:"DIAGNOSTICS_"+city.toUpperCase(),
            url:"/diagnostic-immobilier-"+city.toLowerCase()
        };
        console.log('Saving ',payload.code,payload);
        (function(payload,callback){
            api.ctrl('pages','save',payload).then(function(){
                callback();
            });
        })(payload,()=>{
                _codes = _codes.slice(1);
                iterate();
        });
    }
    iterate();
})(window.details,r.ws);


//REPLACE WEINRE


(function(s,api){
    function replaceAll(word, search, replacement) {
        return word.replace(new RegExp(search, 'g'), replacement);
    }
    
    var items = null;
    api.ctrl('pages','getAll').then(function(res){
        items = res.result;
        console.log(items.length,'ITEMS FETCH');
        iterate();
    });
    function iterate(){
        if(items.length==0){
            return console.log('FINISH');
        }
        var item = items[0];
        var str = item.content;
        str = window.decodeURIComponent(str);
        str = replaceAll(str,'https://white-house-78-javoche.c9users.io','https://diagnostical.fr');
        item.content = window.encodeURIComponent(str);
        api.ctrl('pages','save',item).then(function(){
            console.log(item.code,'REPLACED!');
            items = items.slice(1);
            iterate();
        });
    }
})(window.details,r.ws);

