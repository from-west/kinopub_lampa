// KinoPub плагин для Lampa v2.1 ==
(function () {
    'use strict';

    function KinopubPlugin() {
        var network = new Lampa.Reguest();
        var html = $('<div></div>');
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var body = $('<div class="kinopub-content category-full"></div>');
        var items = [];
        var token = Lampa.Storage.get('kp_token') || '';
        var currentSection = 'movie';

        this.create = function () {
            this.activity.loader(true);
            renderMenu();
            if (!token) {
                askLogin();
            } else {
                loadItems(currentSection);
            }
            return this.render();
        };

        function renderMenu() {
            var menu = $('<div class="kinopub-menu selector"><span>Фильмы</span> <span>Сериалы</span> <span>Новинки</span> <span>Избранное</span> <span>Сброс</span></div>');

            menu.find('span').eq(0).on('hover:enter', () => switchSection('movie'));
            menu.find('span').eq(1).on('hover:enter', () => switchSection('tvshow'));
            menu.find('span').eq(2).on('hover:enter', () => switchSection('movie', true));
            menu.find('span').eq(3).on('hover:enter', () => switchSection('bookmarks'));
            menu.find('span').eq(4).on('hover:enter', () => {
                token = '';
                Lampa.Storage.set('kp_token', '');
                Lampa.Noty.show('Авторизация сброшена');
                askLogin();
            });

            html.append(menu);
        }

        function switchSection(type, isNew = false) {
            body.empty();
            currentSection = type;
            loadItems(type, isNew);
        }

        function askLogin() {
            Lampa.Input.edit({
                title: 'Авторизация в KinoPub',
                value: '',
                placeholder: 'Логин:Пароль',
                free: true,
                nosave: true
            }, function (value) {
                var parts = value.split(':');
                if (parts.length === 2) {
                    doAuth(parts[0], parts[1]);
                } else {
                    Lampa.Noty.show('Неверный формат');
                }
            });
        }

        function doAuth(username, password) {
            var basic = 'a2FkaTprYWRpc2VjcmV0';
            $.ajax({
                url: 'https://api.kinopub.me/oauth2/token',
                method: 'POST',
                headers: {
                    Authorization: 'Basic ' + basic,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: 'grant_type=password&username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password),
                success: function (data) {
                    token = data.access_token;
                    Lampa.Storage.set('kp_token', token);
                    Lampa.Noty.show('Авторизация успешна');
                    loadItems(currentSection);
                },
                error: function () {
                    Lampa.Noty.show('Ошибка авторизации');
                }
            });
        }

        function loadItems(type, isNew = false) {
            var url = 'https://api.kinopub.me/v1/items?perpage=20';
            if (type === 'movie' || type === 'tvshow') url += '&type=' + type;
            if (isNew) url += '&section=new';
            if (type === 'bookmarks') url = 'https://api.kinopub.me/v1/bookmarks';

            $.ajax({
                url: url,
                headers: {
                    Authorization: 'Bearer ' + token
                },
                success: function (data) {
                    appendItems(data.items || data);
                    scroll.append(body);
                    html.append(scroll.render());
                },
                error: function () {
                    Lampa.Noty.show('Ошибка загрузки данных');
                }
            });
        }

        function appendItems(list) {
            body.empty();
            list.forEach(function (item) {
                var card = Lampa.Template.get('card', {
                    title: item.title,
                    release_year: item.year
                });
                card.addClass('card--collection');
                card.find('.card__img')[0].src = item.posters?.medium || '';

                card.on('hover:enter', function () {
                    if (item.torrents && item.torrents.length > 0) {
                        var playlist = item.torrents.map(t => ({
                            title: t.quality,
                            url: t.url
                        }));

                        Lampa.Player.play({
                            title: item.title,
                            url: playlist[0].url,
                            playlist: playlist
                        });
                    } else {
                        Lampa.Noty.show('Нет источников');
                    }
                });

                body.append(card);
                items.push(card);
            });
        }

        this.render = function () {
            return html;
        };

        this.destroy = function () {
            scroll.destroy();
            html.remove();
            body.remove();
            items = [];
        };
    }


    Lampa.Component.add('kinopub_plugin', KinopubPlugin);


    Lampa.SettingsApi.addComponent({
        component: 'kinopub_plugin',
        name: 'KinoPub'
    });

    Lampa.SettingsApi.addParam({
        component: 'kinopub_plugin',
        param: {
            name: 'login_button',
            type: 'button'
        },
        field: {
            name: '🔐 Войти в KinoPub'
        },
        onSelect: function () {
            Lampa.Activity.push({
                url: 'kp',
                title: 'KinoPub',
                component: 'kinopub_plugin',
                page: 1
            });
        }
    });
})();
