/*global $U*/
/*global moment*/
/*global _*/
/*global app*/
/*global Quill*/
(function() {



    app.controller('ctrl-text-edit', ['server', '$scope', '$rootScope', '$routeParams', 'focus',
        function(db, s, r, params) {
            //
            $U.expose('s', s);
            //
            s.item = {
                code: '',
                description: '',
                content: ''
            };
            check(); //checks when the wysing lib is ready and init the components.
            //
            s.read = function() {
                    db.ctrl('Text', 'get', {
                        _id: s.item._id
                    }).then(function(res) {
                        if (res.ok) {
                            s.item = res.result;
                            s.editor.setHTML(window.decodeURIComponent(s.item.content));
                        }
                        else {
                            r.warningMessage('Server issue while reading item. Try later.');
                        }
                    })
                }
                //
            s.save = function() {
                if (!s.item.code)           return r.warningMessage('Code required');
                if (!s.item.description)    return r.warningMessage('Description required');
                //
                db.ctrl('Text', 'save', s.item).then(function() {
                    r.route('texts');
                });
            };
            s.delete = function() {
                s.confirm('Delete ' + s.item.code + ' ?', function() {
                    db.ctrl('Text', 'remove', {
                        _d: s.item._id
                    });
                });
            };

            function check() {
                if (typeof window.Quill !== 'undefined') {
                    r.dom(init, 2000);
                }
                else setTimeout(check, 100);
            }

            //

            function init() {
                s.editor = new Quill('#editor', {
                    styles: {
                        '.ql-editor': {
                            'font-family': "'Avenir-Book'"
                        },
                        '.ql-editor a': {
                            'text-decoration': 'none'
                        }
                    },
                    modules: {
                        toolbar: '#toolbar'
                    },
                    theme: 'snow'
                });

                s.editor.on('text-change', function(delta, source) {
                    var html = s.editor.getHTML();
                    s.item.content = window.encodeURIComponent(html);
                });



                if (params && params.id && params.id.toString() !== '-1') {
                    s.item._id = params.id;
                    r.dom(s.read, 0);
                }
                else {

                }
            }
        }
    ]);


    app.directive('textsList', function(
        $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, server, $mongoosePaginate) {
        return {
            restrict: 'AE',
            replace: true,
            scope: {},
            templateUrl: 'views/directives/directive.fast-crud.html',
            link: function(s, elem, attrs) {},
            controller: function($scope, $element, $attrs, $transclude) {
                var r = $rootScope,
                    db = server,
                    s = $scope,
                    dbPaginate = $mongoosePaginate.get('Text');
                s.title = "";
                r.routeParams({
                    prevRoute: 'texts'
                });

                function update(items, cb) {
                    var data = {
                        //__select: "_client _diag address diagStart diagEnd price status created createdAt",
                        /*__populate: {
                            '_client': 'email',
                            '_diag': 'email'
                        },*/
                        __sort: "-createdAt",

                    };

                    r.dom(_apply);

                    function _apply() {

                        var code = s.model.filter.fields.code;
                        if (code) {
                            data.__rules = data.__rules || {};
                            data.__rules.code = {
                                $in: code
                            };
                        }

                        dbPaginate.ctrl(data, s.model).then(res => {
                            if (cb) {
                                cb(res.result);
                            }
                            else {
                                s.model.update(res.result, null);
                            }
                        });
                    }
                }
                s.model = {
                    init: () => update(),
                    filter: {
                        template: 'textsFilter',
                        rules: {
                            code: 'contains'
                        }
                    },
                    pagination: {
                        itemsPerPage: 5
                    },
                    paginate: (cb) => {
                        update(null, cb)
                    },
                    click: (item, index) => {
                        r.routeParams({
                            item: item,
                        });
                        r.route('texts/edit/' + item._id);
                    },
                    buttons: [{
                        label: "Refresh",
                        type: () => "btn diags-btn bg-azure-radiance margin-left-0 margin-right-1",
                        click: () => update()
                    }, {
                        label: "New Item",
                        type: () => "btn diags-btn bg-azure-radiance margin-right-1",
                        click: () => r.route('texts/edit/-1')
                    }],
                    columns: [{
                        label: "Code",
                        name: 'code' //,
                            //format: (v, item) => item._diag.email
                    }, {
                        label: "Description",
                        name: 'description' //,
                            //format: (v, item) => item._client.email
                    }, {
                        label: 'UpdatedAt',
                        name: 'updatedAt',
                        format: (v, item) => {
                            return r.momentFormat(item.updatedAt, 'DD-MM-YY HH:mm');
                        }
                    }],
                    items: [],
                    records: {
                        label: 'Records',
                        show: true
                    }
                };

            }
        };
    });
})();