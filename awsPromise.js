var Q = require('q');
var AWS = require('aws-sdk');

var ec2 = new AWS.EC2({
  region: 'sa-east-1'
});

var cloudWatch = new AWS.CloudWatch({
  region: 'sa-east-1'
});

var awsPromiseWrapper = function() {

  var describeVolumesPromise;

  describeVolumesPromise = Q.nbind(ec2.describeVolumes, ec2);

  describeInstancesPromise = Q.nbind(ec2.describeInstances, ec2);

  listMetricsPromise = Q.nbind(cloudWatch.listMetrics, cloudWatch);

  getMetricStatisticsPromise = Q.nbind(cloudWatch.getMetricStatistics, cloudWatch);

  listMetricsPromises = Q.nbind(cloudWatch.listMetrics, cloudWatch);



  return {
    describeVolumes: describeVolumesPromise,
    describeInstances: describeInstancesPromise,
    listMetrics: listMetricsPromise,
    getMetricStatistics: getMetricStatisticsPromise,
    listMetrics: listMetricsPromises
  }

}();


module.exports = awsPromiseWrapper;
