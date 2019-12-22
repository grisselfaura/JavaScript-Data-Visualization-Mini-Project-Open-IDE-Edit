queue()
    .defer(d3.csv, "data/Salaries.csv")
    .await(makeGraphs);
    
function makeGraphs(error, salaryData){
    var ndx = crossfilter(salaryData);
    
    salaryData.forEach(function(d){
        d.salary = parseInt(d.salary);
        d.yrs_since_phd = parseInt(d["yrs.since.phd"])  //also to parse my yrs_since_phd from string to int.REMOVE DOTS TO AVOID PROBLEMS
        d.yrs_service = parseInt(d["yrs.service"])
    });
    
    show_discipline_selector(ndx);//function takes the ndx crossfilter as its only argument
    
    show_percent_that_are_professors(ndx, "Female", "#percentage-of-women-professors");//added extra arguments to this in a few minutes so that it'll work for both men and women.
    show_percent_that_are_professors(ndx, "Male", "#percentage-of-men-professors"); //added the div id here
    
    show_gender_balance(ndx);
    show_average_salary(ndx);
    show_rank_distribution(ndx);
    
    show_service_to_salary_correlation(ndx);
    show_phd_to_salary_correlation(ndx); //duplicated function and modify accordingly
    
    dc.renderAll();
}

function show_discipline_selector(ndx) {
    var dim = ndx.dimension(dc.pluck('discipline'));
    var group = dim.group();
    
    dc.selectMenu("#discipline-selector")
        .dimension(dim)
        .group(group);
}

function show_percent_that_are_professors(ndx, gender, element) { // generilize code  by adding a gender argument & because we plot the male and female data in two different divs, we're also going to have to pass in the element where we want the data plotted. 
    var percentageThatAreProf = ndx.groupAll().reduce( //We're not actually plotting data on a chart, so we don't need a dimension and a group.
        function (p, v) {
            if(v.sex === gender){
                p.count++; // so our add function always increment total
                if(v.rank == "Prof") { //second statement = if the rank of the piece of data we're looking at is professor.
                    p.are_prof++;
                }
            }
            return p;
        },
        
        function (p, v) {
            if(v.sex === gender){
                p.count--; // so our remove function always increment total
                if(v.rank == "Prof") { //second statement = if the rank of the piece of data we're looking at is professor.
                    p.are_prof--;
                }
            }
            return p;
        },
            
        function () {
            return {count: 0, are_prof: 0};//a count of the total number of records that we've encountered and a second argument telling us how many of those are our professors
        }
    ); 
    
    dc.numberDisplay(element) // dimensional charting number display, replaced div id and added element word so i can plot humner for woman and separately for man
        .formatNumber(d3.format(".2%"))
        .valueAccessor(function (d) {//our values have a count part and an are_prof part right
            if (d.count == 0) { 
                return 0;
            } else {
                return (d.are_prof / d.count);
            }  
        })
        .group(percentageThatAreProf);//renamed to make code more accurate
        
}

function show_gender_balance(ndx){
    var dim = ndx.dimension(dc.pluck('sex'));
    var group = dim.group();
    
    dc.barChart("#gender-balance")
        .width(350)
        .height(250)
        .margins({top: 10, right: 50, bottom: 50, left: 50})
        .dimension(dim)
        .group(group)
        .transitionDuration(500)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .xAxisLabel("gender-balance")
        .yAxis().ticks(20);
        
}

function show_average_salary(ndx){
    var dim = ndx.dimension(dc.pluck('sex'));
    
    function add_item(p, v) {
        p.count++;
        p.total += v.salary;
        p.average = p.total / p.count;
        return p;
    }
    
    function remove_item(p, v) {
        p.count--;
        if(p.count == 0) {
            p.total = 0;
            p.average = 0;
        } else {
            p.total -= v.salary;
            p.average = p.total / p.count;    
        }
        return p;
    }
    
    function initialise() {
        return {count: 0, total: 0, average: 0};
    }
    
    var averageSalaryByGender = dim.group().reduce(add_item, remove_item, initialise); // add/remove/initialize functions were coded external to the reducer and then we passed them in
    //console.log(averageSalaryByGender.all());

    dc.barChart("#average-salary")
        .width(350)
        .height(250)
        .margins({top: 10, right: 50, bottom: 50, left: 50})
        .dimension(dim)
        .group(averageSalaryByGender)// new group created with the custom reducer which is the averagesalarybygender. this value has actually 3 values:count, total and average
        .valueAccessor(function(d){//We need to write a value accessor to specify which of those 3 values actually gets plotted.And we're interested in the average.
            return d.value.average.toFixed(2);
        })
        .transitionDuration(500)
        .x(d3.scale.ordinal())//values are male and female so ordinal units
        .xUnits(dc.units.ordinal)
        .elasticY(true)
        .xAxisLabel("averageSalaryByGender")
        .yAxis().ticks(4);
        
}     
        
function show_rank_distribution(ndx) {
   
    // var profByGender = dim.group().reduce( // what % of men are prof, assist or assoc and the same for women
    //  // this is an inline function coded inside the reducer   
    //         function (p, v) {
    //             p.total++; // so our add function always increment total
    //             if(v.rank == "Prof") { //if the rank of the piece of data we're looking at is professor.
    //                 p.match++;
    //             }
    //             return p;
    //         },
        
    //         function (p, v) {
    //             p.total--; // so our remove function always decrement our total
    //             if(v.rank == "Prof") { //if the piece of data we're removing is a professor.
    //                 p.match--;
    //             }
    //             return p;
    //         },
            
    //         function () {
    //             return {total: 0, match: 0};//total, which will be an accumulator, or a count, for the number of rows that we're dealing with.
    //         } // And match will be the count of how many of those rows are professors.
    // );
    
    function rankByGender(dimension, rank){//Its arguments are the dimension that we're interested in grouping on and the rank that we're looking to find.
        return dimension.group().reduce( // what % of men are prof, assist or assoc and the same for women
     // this is an inline function coded inside the reducer   
            function (p, v) {
                p.total++; // so our add function always increment total
                if(v.rank == rank) { //if the rank of the piece of data we're looking at is professor.
                    p.match++;
                }
                return p;
            },
        
            function (p, v) {
                p.total--; // so our remove function always decrement our total
                if(v.rank == rank) { //if the piece of data we're removing is a professor.
                    p.match--;
                }
                return p;
            },
            
            function () {
                return {total: 0, match: 0};//total, which will be an accumulator, or a count, for the number of rows that we're dealing with.
            } // And match will be the count of how many of those rows are professors.
        );
    }
    
    var dim = ndx.dimension(dc.pluck('sex')); //we split data by gender here
    var profByGender = rankByGender(dim, "Prof");
    var asstProfByGender = rankByGender(dim, "AsstProf");
    var assocProfByGender = rankByGender(dim, "AssocProf");
    
    dc.barChart("#rank-distribution")
        .width(350)
        .height(250)
        .dimension(dim)
        .group(profByGender, "Prof")//then we stack the other two groups for assistant professor and associate professor on top of that using the stack() method of the bar chart.
        .stack(asstProfByGender, "AsstProf") // we include a second argument = label to show what each slice of the stack means
        .stack(assocProfByGender, "AssocProf")
        .valueAccessor(function(d) {
            if(d.value.total > 0) { //we could have put that calculation into the custom reducer as a third property in the data structure that's created by the initialise() function.
                return (d.value.match / d.value.total) * 100;
            } else {
                return 0;
            }    
        })
        .x(d3.scale.ordinal())//values are male and female so ordinal units
        .xUnits(dc.units.ordinal)
        .xAxisLabel("rankByGender")
        .legend(dc.legend().x(320).y(20).itemHeight(15).gap(5))
        .margins({top: 10, right: 100, bottom: 50, left: 30});
}

function show_service_to_salary_correlation(ndx) {
    
    //we need to pick one of the attributes in our data set and map the values in that attribute to the colors that we want. = sex column
    var genderColors = d3.scale.ordinal() //we'll map the colors pink and blue to the values in that attribute, female and male are ordinal values
        .domain(["Female", "Male"])
        .range(["red", "blue"]);
    
    var eDim = ndx.dimension(dc.pluck('yrs_service')); //years of service, and we only use this to work out the bounds of the x-axis, the minimum and maximum years of service that we need to plot.
    var experienceDim = ndx.dimension(function(d) { 
        return [d.yrs_service, d.salary, d.rank, d.sex]; // by adding d.sex here we specified how the chart can pick out the values that it needs to pass in to the scale to get back a color.
     //The second dimension that we create actually returns an array with two parts: one being the years of service, and the other being the salary.
    });
    
    var experienceSalaryGroup = experienceDim.group(); //distinct dot on our plot for each unique years of service and salary combination
    
    var minExperience = eDim.bottom(1)[0].yrs_service; //minimum years of experience and we take the bottom(1) value,
    var maxExperience = eDim.top(1)[0].yrs_service; //maximum years of experience and we take the top(1) value 
    
     dc.scatterPlot("#service-salary")
        .width(800)
        .height(400)
        .x(d3.scale.linear().domain([minExperience, maxExperience])) // not ordinal woman and men
        .brushOn(false)
        .symbolSize(8)
        .clipPadding(10)
        .yAxisLabel("Salary")
        .xAxisLabel("Years of Service")
        .title(function(d) { 
            return d.key[2] + " earned " + d.key[1]; //key 1 = relates to that years of service and salary dimension that we created earlier
        }) // item 2 equals to rank from the experienceDim
        .colorAccessor(function(d) {  //colorAccessor() decide which piece of data we use as an input into our genderColors scale
            return d.key[3]; // item number 3 from the experienceDim
        })    
        .colors(genderColors)  //we can add it to our graph using the colors() method of the scatter plot.
        .dimension(experienceDim) // that dim that contains both the years of service and salary.
        .group(experienceSalaryGroup) //the group is just the group that we created.
        .margins({top: 10, right: 50, bottom: 75, left: 75});
}       

function show_phd_to_salary_correlation(ndx) { //duplicated function and modify accordingly
    
   
    var genderColors = d3.scale.ordinal() // REMAIN UNCHANGED
        .domain(["Female", "Male"])
        .range(["red", "blue"]);
    
    var pDim = ndx.dimension(dc.pluck('yrs_since_phd')); //RENAME VARIABLES and updated pluck
    var phdDim = ndx.dimension(function(d) {  //RENAME VARIABLES
        return [d.yrs_since_phd, d.salary, d.rank, d.sex];   // updated dimentions
    });
    
    var phdSalaryGroup = phdDim.group(); // updated variable name and the dim.group accordingly
    
    var minPhd = pDim.bottom(1)[0].yrs_since_phd; // updated variable name and the dim and the yearsincephd
    var maxPhd = pDim.top(1)[0].yrs_since_phd; //
    
     dc.scatterPlot("#phd-salary") // updated div
        .width(800)
        .height(400)
        .x(d3.scale.linear().domain([minPhd, maxPhd])) //updated min max variables names
        .brushOn(false)
        .symbolSize(8)
        .clipPadding(10)
        .yAxisLabel("Salary")
        .xAxisLabel("Years Since Phd") //updated labek
        .title(function(d) {  // REMAIN UNCHANGED
            return d.key[2] + " earned " + d.key[1]; 
        }) 
        .colorAccessor(function(d) {  // REMAIN UNCHANGED
            return d.key[3]; 
        })    
        .colors(genderColors)  
        .dimension(phdDim) //updated the dim.group accordingly
        .group(phdSalaryGroup) //updated the variable name accordingly
        .margins({top: 10, right: 50, bottom: 75, left: 75});
}    