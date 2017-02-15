/*global angular*/
angular.module('app').controller('settings-pages', ['server', '$scope', '$rootScope', '$routeParams', 'focus', '$log', '$timeout', 'backendApi', 'backendApiHelper',
    function(db, s, r, params, focus, $log, $timeout, backendApi, backendApiHelper) {
        window.s = s;
        s.params = params;
        s.isNew = () => s.params && s.params.id && s.params.id.toString() === 'new';
        s.isEdit = () => s.params && s.params.id && s.params.id.toString() != '-1' && !s.isNew();
        s.isDetailView = () => s.isEdit() || s.isNew();
        var collection = (action, data) => {
            return db.ctrl('pages', action, data);
        };

        var template = '<div class="diags-bg">';
        template += '<div class="diags-content container diags-selection padding-none">';
        template += '<div class="row diags-bg-block-40 hidden-xs"></div>';
        template += '<div class="row diag-row padding-top-three">';
        template += '__HTML__';
        template += '</div>';
        template += '</div>';
        template += '<div class="row diags-bg-block-40 hidden-xs"></div>';
        template += '</div>';



        if (s.isDetailView()) {
            s.item = {};
            var apiHelper = backendApiHelper(backendApi.pages, s.item);
            //if (s.isEdit()) {
            s.showRemove = () => s.item && s.item._id;
            s.remove = () => {
                if (!s.showRemove()) return;
                r.openConfirm('Remove ' + s.item.code + ' ?', () => {
                    backendApi.pages.removeWhen({
                        _id: s.item._id
                    }).then(res => {
                        r.route('settings-pages/-1');
                    });
                });

            };
            //}
            s.save = () => {
                if (!s.item.code) return r.warningMessage('Code required');
                if (!s.item.description) return r.warningMessage('Description required');


                if (apiHelper.notChecked('code') && apiHelper.isNew()) {
                    return apiHelper.checkExists('code').on('ok', s.save).on('duplicate', () => r.warningMessage('Code already exists'));
                }

                if (apiHelper.notChecked('url')) {
                    return apiHelper.checkExists('url').on('ok', s.save).on('duplicate', () => r.warningMessage('Url already exists'));
                }




                s.item.content = getACEContent(true);
                s.item.template = window.encodeURIComponent(template);
                var payload = Object.assign({}, s.item);
                payload.__match = {
                    code: payload.code
                };
                backendApi.pages.save(payload).then(res => {
                    if (res && res.ok && res.result) {
                        r.dom(() => {
                            var el = $('#save-hint');
                            var hint = el.html();
                            el.html('Saved!');
                            s.item = res.result;
                            r.dom(() => {
                                el.html(hint);
                            }, 1000);
                        });
                    }
                    else {
                        if (res.err && res.err.code == 11000) {
                            var errmsg = res.err.errmsg;
                            var value = errmsg.substring(errmsg.indexOf('"') + 1, errmsg.lastIndexOf('"'));
                            var field = Object.keys(res.err.op).filter(k => res.err.op[k] == value)[0];
                            return r.warningMessage('Value ' + value + ' (field ' + field + ') already exists in database.');
                        }
                        r.warningMessage('Server error, see the developer console.');
                    }
                }).error((msg) => {
                    r.errorMessage(JSON.stringify(msg));
                }).on('validate', (msg) => {
                    r.warningMessage(JSON.stringify(msg));
                });
            };
            s.back = () => {
                return r.route('settings-pages/-1');
            };

            $log.log('waiting ace');
            checkAndInitializeAceEditor(() => {
                //after ace initialization
                $log.log('ace loaded');
                if (s.isEdit()) {
                    $log.log('fetching item');
                    collection('get', {
                        _id: s.params.id
                    }).then(res => {
                        if (res && res.ok) {
                            s.item = res.result;
                            setACEContent(window.decodeURIComponent(s.item.content));
                        }
                        else {
                            r.errorMessage('Item could not be retrieved.');
                        }
                    });
                }
            });

        }
        else {
            //list view view
            $timeout(function() {
                r.$emit('lvw-update');
            }, 1000);
        }


        /*ACE*/
        function getACEContent(encode) {
            encode = encode || true;
            var rta = '';
            if (s.editor && s.editor.getValue) {
                rta = s.editor.getValue() || '';
            }
            if (encode) rta = window.encodeURIComponent(rta);
            return rta;
        }

        function setACEContent(html) {
            if (s.editor && s.editor.getValue) {
                return s.editor.setValue(html || '');
            }
            else {
                r.errorMessage('A value is trying to be set and ACE Editor is not yet initialized.');
            }
        }

        function initAce() {
            s.editor = window.ace.edit("editor");
            s.editor.getSession().setMode("ace/mode/html");
            s.editor.setTheme("ace/theme/merbivore");
            s.editor.setOptions({
                enableBasicAutocompletion: true,
                enableSnippets: true
            });
            s.editor.getSession().setUseWrapMode(true)
            s.editor.commands.addCommand({
                name: "fullscreen",
                bindKey: "ctrl-shift-f",
                exec: function(env, args, request) {
                    s.toggleFullscreen();
                }
            });
            $log.debug('Fullscreen Ctrl-shift-f');
            s.editor.commands.addCommand({
                name: "save",
                bindKey: "ctrl-shift-s",
                exec: function(env, args, request) {
                    s.save()
                }
            });

            s.editor.commands.addCommand({
                name: "showKeyboardShortcuts",
                bindKey: {
                    win: "Ctrl-Alt-h",
                    mac: "Command-Alt-h"
                },
                exec: function(editor) {
                    window.ace.config.loadModule("ace/ext/keybinding_menu", function(module) {
                        module.init(editor);
                        editor.showKeyboardShortcuts()
                    })
                }
            })
            $log.debug('Keyboard hints Ctrl-Alt-h');
            waitBeautify(function() {
                s.editor.commands.addCommand({
                    name: "beautify",
                    bindKey: "ctrl-alt-f",
                    exec: function(env, args, request) {
                        s.editor.session.setValue(html_beautify(s.editor.session.getValue()));
                    }
                });
                $log.debug('Beautify added (CTRL + ALT + K)');
            });



        };


        function waitBeautify(cb) {
            if (!window.ace) return setTimeout(() => waitBeautify(cb), 500);
            if (window.html_beautify) {
                cb && cb();
            }
            else {
                return setTimeout(() => waitBeautify(cb), 500);
            }
        }

        function checkAndInitializeAceEditor(cb) {
            if (typeof window.ace !== 'undefined') {
                r.dom(() => {
                    initAce();
                    cb && cb();
                });
            }
            else setTimeout(() => {
                checkAndInitializeAceEditor(cb);
            }, 100);
        }
    }
]).directive('pagesList', function(
    $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, server, $mongoosePaginate, $log) {
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
                dbPaginate = $mongoosePaginate.get('pages');

            s.title = "";
            r.routeParams({
                prevRoute: 'settings'
            });


            function update(items, cb) {
                var data = {
                    /*
                    __select: "_client _diag address start end price status created createdAt",
                    __populate: {
                        '_client': 'email',
                        '_diag': 'email'
                    },*/
                    __sort: "-createdAt",

                };

                r.dom(_apply);

                function _apply() {
                    //
                    data = Object.assign(data, s.model.filter.payload || {});
                    //
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
                init: () => {
                    $log.log('is-lvw-?');
                    r.$on('lvw-update', () => {
                        $log.log('is-lvwl');
                        s.model.filter.firstTime();
                    });
                },
                filter: {
                    template: 'pagesFilter',
                    update: update,
                    rules: {
                        status: 'in'
                    }
                },
                pagination: {
                    itemsPerPage: 10
                },
                paginate: (cb) => {
                    update(null, cb)
                },
                click: (item, index) => {
                    r.routeParams({
                        item: item,
                    });
                    r.route('settings-pages/' + item._id);
                },
                buttons: [{
                    label: "Rafraîchir",
                    type: () => "btn diags-btn bg-azure-radiance margin-left-0 margin-right-1",
                    click: () => update()
                }, {
                    label: "Créer",
                    type: () => "btn diags-btn bg-azure-radiance margin-right-1",
                    click: () => r.route('settings-pages/new')
                }],
                columns: [{
                    label: "Code",
                    name: 'code',
                    //format: (v, item) => item._diag.email
                }, {
                    label: "Description",
                    name: 'description',
                    //format: (v, item) => item._diag.email
                }, {
                    label: "URL",
                    name: 'url',
                    //format: (v, item) => item._diag.email
                }, {
                    label: 'Created',
                    name: 'createdAt',
                    format: (v, item) => {
                        return r.momentFormat(item.createdAt, 'DD-MM-YY HH:mm');
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