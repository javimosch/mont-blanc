var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var logger = resolver.ctrl('Log').createLogger({
    name: "REPORTS",
    category: ""
});
module.exports = {
    monthlyRevenueWithCoupons: (data, cb) => {
        return resolver.co(function*() {
            //if (!data.month) throw Error('_id (couponId) required');

            var docs = yield resolver.controllers().order.model.aggregate([
                    /*{
                            $project: {
                                createdAt: "$createdAt",
                                email: "$email"
                            }
                        }, */
                    {
                        $match: {
                            'paidAt': {
                                $ne: null
                            },
                            status: {
                                $ne: "created"
                            }
                        }
                    }, {
                        $group: {
                            _id: {
                                year: {
                                    $year: '$paidAt'
                                },
                                month: {
                                    $month: '$paidAt'
                                }
                            },
                            revenueHT: {
                                $sum: "$revenueHT"
                            }
                        }
                    }, {
                        /* sort descending (latest subscriptions first) */
                        $sort: {
                            '_id.year': -1,
                            '_id.month': -1
                        }
                    }, {
                        $project: {
                            year: "$_id.year",
                            month: "$_id.month",
                            revenueHT: "$revenueHT"
                        }
                    }
                ])
                //.explain(logger.debug)
                .exec();

            cb(null, docs);
        }).catch(cb);
    }
};
