var TOTAL_NUMBER_OF_DAYS = 365;
var TOTAL_NUMBER_OF_PERSONS = 50;

var OBJECTIVE_IMPORTANCE_FAIRNESS = 2;
var OBJECTIVE_IMPORTANCE_DISTR = 1;

function compareNumbers(a, b) {
    return a - b;
}

function removeFromArray(array, elem) {
    var index = array.indexOf(elem);
    if (index > -1) {
        array.splice(index, 1);
    }
}

function copyArray1D(array1, array2) {
    for (var i = 0; i < array1.length; i++) array2[i] = array1[i];
}

function copyArray2D(array1, array2) {
    for (var i = 0; i < array1.length; i++)
        for (var j = 0; j < array1[i].length; j++)
            array2[i][j] = array1[i][j];
}

/**
 * Randomize array element order in-place.
 * Using Durstenfeld shuffle algorithm.
 */
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

function isDifferenceGood(diff)
{
    if (OBJECTIVE_IMPORTANCE_FAIRNESS > OBJECTIVE_IMPORTANCE_DISTR) {
        for (var i = 0; i < diff.length; i++)
        {
            if (diff[i] < 0) return true;
            if (diff[i] > 0) return false;
        }
        return false;
    }
    else {
        for (var i = diff.length - 1; i >= 0; i--)
        {
            if (diff[i] < 0) return true;
            if (diff[i] > 0) return false;
        }
        return false;
    }
    return false;
}

function smallerObj(obj1, obj2)
{
    if (OBJECTIVE_IMPORTANCE_FAIRNESS > OBJECTIVE_IMPORTANCE_DISTR) {
        for (var i = 0; i < obj1.length; i++)
        {
            if (obj1[i] < obj2[i]) return true;
            if (obj1[i] > obj2[i]) return false;
        }
        return false;
    }
    else {
        for (var i = obj1.length - 1; i >= 0; i--)
        {
            if (obj1[i] < obj2[i]) return true;
            if (obj1[i] > obj2[i]) return false;
        }
        return false;
    }
    return false;
}

function smallerObjABS(obj1, obj2) // OBJECTIVE_IMPORTANCE_FAIRNESS > OBJECTIVE_IMPORTANCE_DISTR
{
    for (var i = 0; i < obj1.length; i++)
    {
        if (obj1[i] < obj2[i] - 1e-5) return true;
        if (obj1[i] > obj2[i] + 1e-5) return false;
    }
    return false;
}

var best_obj;
var best_assignment;

class Person {
  
    constructor(id)
    {
       this.id_ = id;
       this.list_of_available_days_ = new Array(0);
    }

    addAvailableDay(d) { this.list_of_available_days_.push(d); }
}

class Day {
  
    constructor(id, d) 
    {
       this.id_ = id;
       this.demand_ = d;
       this.list_of_available_persons_ = new Array(0);
    }

    addAvailablePerson(p) { this.list_of_available_persons_.push(p); }
}

class Data {
    
    constructor(nP, nD) 
    {
       this.list_of_persons_ = new Array(0);
       this.list_of_days_ = new Array(0);
       this.availability_matrix_PD_ = new Array(nP);
       for (var i = 0; i < nP; i++) {
           this.availability_matrix_PD_[i] = new Array(nD);
           for (var j = 0; j < nD; j++) this.availability_matrix_PD_[i][j] = 0;
        }
    }
    getNmbPersons() { return this.list_of_persons_.length; }
	getNmbDays()    { return this.list_of_days_.length;    }
    getPerson(p) { return this.list_of_persons_[p]; }
	getDay(d)    { return this.list_of_days_[d];    }
    addPerson(p) { this.list_of_persons_.push(p); }
    addDay(d)    { this.list_of_days_.push(d);    }
	setAvailability(p, d, a)
    {
		this.availability_matrix_PD_[p][d] = a;
		if (a > 0) this.list_of_days_[d].addAvailablePerson(p);		
	}
	getAvailability(p,d) { return this.availability_matrix_PD_[p][d]; }	
    isPersonAvailableOnDay(p, d) { return (this.availability_matrix_PD_[p][d] > 0); }

    toString() {
        var s = "";
        s = s + ("#persons " + this.list_of_persons_.length + "\n");
        s = s + ("#days " + this.list_of_days_.length + "\n");        
        var mindemand = 10000;
        var maxdemand = 0;
        for (var i = 0; i < this.list_of_days_.length; i++) if (this.list_of_days_[i].demand_ < mindemand) mindemand = this.list_of_days_[i].demand_;
        for (var i = 0; i < this.list_of_days_.length; i++) if (this.list_of_days_[i].demand_ > maxdemand) maxdemand = this.list_of_days_[i].demand_;
        s = s + ("demand for days: [" + mindemand + "," + maxdemand + "]\n");
        return s;
    }

}


class Solution {

    constructor(data) {
        this.data_ = data;        
        this.assignment = new Array(data.getNmbPersons());
        this.nmb_assignments_for_person_ = new Array(data.getNmbPersons());
        this.spread_for_person_ = new Array(data.getNmbPersons());
        this.nmb_assignments_for_day_ = new Array(data.getNmbDays());        
        this.list_of_days_for_person_ = new Array(data.getNmbPersons());
        this.list_of_days_for_person_sorted_ = new Array(data.getNmbPersons());
        this.list_of_persons_for_day_ = new Array(data.getNmbDays());        
        for (var i = 0; i < data.getNmbPersons(); i++) {
            this.assignment[i] = new Array(data.getNmbDays());
            for (var j = 0; j < data.getNmbDays(); j++) this.assignment[i][j] = 0;
            this.nmb_assignments_for_person_[i] = 0;
            this.spread_for_person_[i] = data.getNmbDays();
            this.list_of_days_for_person_[i] = new Array(0);
            this.list_of_days_for_person_sorted_[i] = new Array(0);            
        }        
        for (var i = 0; i < data.getNmbDays(); i++) {
            this.list_of_persons_for_day_[i] = new Array(0);
            this.nmb_assignments_for_day_[i] = 0;            
        }                       
        this.spread_total = data.getNmbDays() * data.getNmbPersons();
        this.min_nmb_assignments_for_a_single_person = 0;
        this.max_nmb_assignments_for_a_single_person = 0;
        this.nmb_persons_with_min_nmb_assignments_ = data.getNmbPersons();
        this.nmb_persons_with_max_nmb_assignments_ = data.getNmbPersons();        
    }

    isPersonAssinedToDay(p, d) { return (this.assignment[p][d] > 0); }
    getNmbAssignmentsForPerson(p) { return this.nmb_assignments_for_person_[p]; }
    getNmbAssignmentsForDay(d) { return this.nmb_assignments_for_day_[d]; }
    
    //add
    assignPersonToDay(p, d)
    {      
        if (this.assignment[p][d] > 0) alert("double assignment p d");            
        if (this.data_.availability_matrix_PD_[p][d] == 0) alert("trying to assign non-campatible person");        

        this.assignment[p][d] = 1;
        this.nmb_assignments_for_person_[p]++;
        this.nmb_assignments_for_day_[d]++;

        this.list_of_days_for_person_[p].push(d);
        this.list_of_persons_for_day_[d].push(p);
        this.list_of_days_for_person_sorted_[p].push(d);
        this.list_of_days_for_person_sorted_[p].sort(compareNumbers);
       
        //update min and max nmb_assignments_for_a_single_person
        if (this.nmb_assignments_for_person_[p] > this.max_nmb_assignments_for_a_single_person) {
            this.max_nmb_assignments_for_a_single_person = this.nmb_assignments_for_person_[p];
            this.nmb_persons_with_max_nmb_assignments_ = 1;
        }
        else
            if (this.nmb_assignments_for_person_[p] == this.max_nmb_assignments_for_a_single_person) {
                this.nmb_persons_with_max_nmb_assignments_++;
        }

        if (this.nmb_assignments_for_person_[p] == this.min_nmb_assignments_for_a_single_person + 1) {
            if (this.nmb_persons_with_min_nmb_assignments_ > 1)
            {
                this.nmb_persons_with_min_nmb_assignments_--;
            }
            else // change minimum and recalculate number of persons with minimum number of assignments
            {
                this.min_nmb_assignments_for_a_single_person = this.nmb_assignments_for_person_[p];
                this.nmb_persons_with_min_nmb_assignments_ = 0;
                for (var i = 0; i < this.data_.getNmbPersons(); i++)
                {
                    if (this.nmb_assignments_for_person_[i] == this.min_nmb_assignments_for_a_single_person) this.nmb_persons_with_min_nmb_assignments_++;
                }
            }
        }

        //update min spread
        var old_spread = this.spread_for_person_[p];
        this.spread_for_person_[p] = 10000;
        for (var i = 0; i < this.list_of_days_for_person_sorted_[p].length - 1; i++)
        {
            if (this.list_of_days_for_person_sorted_[p][i + 1] - this.list_of_days_for_person_sorted_[p][i] < this.spread_for_person_[p])
                this.spread_for_person_[p] = this.list_of_days_for_person_sorted_[p][i + 1] - this.list_of_days_for_person_sorted_[p][i];
        }

        this.spread_total = this.spread_total + (this.spread_for_person_[p] - old_spread);                      
    }
 
    //remove
    unassignPersonFromDay(p, d)
	{
        if (this.assignment[p][d] == 0) { alert("double unassignment p d"); }

		this.assignment[p][d] = 0;
        this.nmb_assignments_for_person_[p]--;
        this.nmb_assignments_for_day_[d]--;

        removeFromArray(this.list_of_days_for_person_[p], d);        
        removeFromArray(this.list_of_days_for_person_sorted_[p], d);
        removeFromArray(this.list_of_persons_for_day_[d], p);

        //update min and max nmb_assignments_for_a_single_person
        if (this.nmb_assignments_for_person_[p] < this.min_nmb_assignments_for_a_single_person)
        {
            this.min_nmb_assignments_for_a_single_person = this.nmb_assignments_for_person_[p];
            this.nmb_persons_with_min_nmb_assignments_ = 1;
		}
		else
            if (this.nmb_assignments_for_person_[p] == this.min_nmb_assignments_for_a_single_person)
            {         
                this.nmb_persons_with_min_nmb_assignments_++;
			}
        
        if (this.nmb_assignments_for_person_[p] == this.max_nmb_assignments_for_a_single_person - 1)
        {                        
            if (this.nmb_persons_with_max_nmb_assignments_ > 1)
            {                
                this.nmb_persons_with_max_nmb_assignments_--;                
			}
			else // change maximum and recalculate number of persons with maximum number of assignments
            {                
                this.max_nmb_assignments_for_a_single_person = this.nmb_assignments_for_person_[p];
                this.nmb_persons_with_max_nmb_assignments_ = 0;
				for (var i = 0; i < this.data_.getNmbPersons(); i++)
				{
                    if (this.nmb_assignments_for_person_[i] == this.max_nmb_assignments_for_a_single_person) this.nmb_persons_with_max_nmb_assignments_++;
				}
			}
		}       

		//update min spread
        var old_spread = this.spread_for_person_[p];
        this.spread_for_person_[p] = 10000;
        for (var i = 0; i < this.list_of_days_for_person_sorted_[p].length - 1; i++)
		{
            if (this.list_of_days_for_person_sorted_[p][i + 1] - this.list_of_days_for_person_sorted_[p][i] < this.spread_for_person_[p])
                this.spread_for_person_[p] = this.list_of_days_for_person_sorted_[p][i + 1] - this.list_of_days_for_person_sorted_[p][i];
		}
        this.spread_total += (this.spread_for_person_[p] - old_spread);
	}

    check()
	{
        for (var d = 0; d < this.data_.getNmbDays(); d++)
        {
            if (this.nmb_assignments_for_day_[d] != this.data_.list_of_days_[d].demand_) return false;
        }
        return true;
    }

    calculateObjective()
    {
        var obj = new Array(2);
        obj[0] = 0; obj[1] = 0;
        
        var fairness_obj = this.max_nmb_assignments_for_a_single_person - this.min_nmb_assignments_for_a_single_person;
        var fairness_sum_sq = 0;
        for (var p = 0; p < this.data_.getNmbPersons(); p++) fairness_sum_sq += (this.nmb_assignments_for_person_[p] * this.nmb_assignments_for_person_[p]);
        var fairness_sum_sq_MAX = (this.data_.getNmbDays() * this.data_.getNmbDays()) * this.data_.getNmbPersons();
        fairness_obj += (fairness_sum_sq / fairness_sum_sq_MAX);

        var distr_obj = (-1) * this.spread_total;
        var distr_sum_sq = 0;
        for (var p = 0; p < this.data_.getNmbPersons(); p++)
        {
            for (var i = 0; i < this.list_of_days_for_person_sorted_[p].length; i++)
            {
                if (i + 1 >= this.list_of_days_for_person_sorted_[p].length) break;
                var d1 = this.list_of_days_for_person_sorted_[p][i];
                var d2 = this.list_of_days_for_person_sorted_[p][i + 1];
                distr_sum_sq += ((d2 - d1) * (d2 - d1));
            }
        }
        var distr_sum_sq_MAX = (this.data_.getNmbDays() * this.data_.getNmbDays()) * this.data_.getNmbPersons();
        distr_obj += (distr_sum_sq / distr_sum_sq_MAX);

        obj[0] = fairness_obj;
        obj[1] = distr_obj;
        return obj;
    }

     greedy_assignment()
     {
         for (var d = 0; d < this.data_.getNmbDays(); d++)
         {
             for (var i = 0; i < this.data_.getDay(d).list_of_available_persons_.length; i++)
             {
                 if (this.nmb_assignments_for_day_[d] >= this.data_.getDay(d).demand_) break;
                 var p = this.data_.getDay(d).list_of_available_persons_[i];
                 this.assignPersonToDay(p, d);                
             }
         }
     }
    
	// replace assignment (p,d) with (p2,d)
	replace(p, d, p2)
    {
        this.unassignPersonFromDay(p, d);
        this.assignPersonToDay(p2, d);
	}

	//calculate the difference in objective with replacing a duty (p, d) with (p2, d)
	calculateObjDiffWithReplacing(p, d, p2)
	{
        if (this.assignment[p][d] == 0)	alert("calculateObjDiffWithReplacing::error");
        
        var diff = new Array(2);
        diff[0] = 0; diff[1] = 0;

        if (this.assignment[p2][d] > 0 || this.data_.isPersonAvailableOnDay(p2, d) == 0) { diff[0] = 1000000; return diff; }
        
		//fairness diff
        var old_fairness = this.max_nmb_assignments_for_a_single_person - this.min_nmb_assignments_for_a_single_person;
        var new_max_nmb_assignments_for_a_single_person = this.max_nmb_assignments_for_a_single_person;
        var new_min_nmb_assignments_for_a_single_person = this.min_nmb_assignments_for_a_single_person;
        if (this.nmb_assignments_for_person_[p] == this.min_nmb_assignments_for_a_single_person)
            new_min_nmb_assignments_for_a_single_person = this.nmb_assignments_for_person_[p] - 1;
        if (this.nmb_assignments_for_person_[p2] == this.min_nmb_assignments_for_a_single_person && this.nmb_persons_with_min_nmb_assignments_ == 1)
            new_min_nmb_assignments_for_a_single_person = this.nmb_assignments_for_person_[p2] + 1;
        if (this.nmb_assignments_for_person_[p2] == this.max_nmb_assignments_for_a_single_person)
            new_max_nmb_assignments_for_a_single_person = this.nmb_assignments_for_person_[p2] + 1;
        if (this.nmb_assignments_for_person_[p] == this.max_nmb_assignments_for_a_single_person && this.nmb_persons_with_max_nmb_assignments_ == 1)
            new_max_nmb_assignments_for_a_single_person = this.nmb_assignments_for_person_[p] - 1;
		var new_fairness = new_max_nmb_assignments_for_a_single_person - new_min_nmb_assignments_for_a_single_person;
		var fairness_diff = new_fairness - old_fairness;

		var sum_sq_diff = 0;
        sum_sq_diff = (this.nmb_assignments_for_person_[p] - 1) * (this.nmb_assignments_for_person_[p] - 1) +
            (this.nmb_assignments_for_person_[p2] + 1) * (this.nmb_assignments_for_person_[p2] + 1)
            - this.nmb_assignments_for_person_[p] * this.nmb_assignments_for_person_[p] - this.nmb_assignments_for_person_[p2] * this.nmb_assignments_for_person_[p2];

        var fairness_sum_sq_MAX = (this.data_.getNmbDays() * this.data_.getNmbDays()) * this.data_.getNmbPersons();
		fairness_diff += (sum_sq_diff / fairness_sum_sq_MAX);

		diff[0] = fairness_diff;
		if (fairness_diff != 0 && OBJECTIVE_IMPORTANCE_FAIRNESS > OBJECTIVE_IMPORTANCE_DISTR)
		{
			return diff;
		}

		//distr diff
		var distr_diff = 0;
		//spread p
        var oldspread_p = this.spread_for_person_[p];
		var newspread_p = 10000;
        sum_sq_diff = 0;
        for (var i = 0; i < this.list_of_days_for_person_sorted_[p].length - 1; i++)
		{
			var s = -1;
            if (this.list_of_days_for_person_sorted_[p][i] == d)
			{
                var dd = this.list_of_days_for_person_sorted_[p][i + 1] - this.list_of_days_for_person_sorted_[p][i];
				sum_sq_diff -= (dd * dd);
				if(i > 0)
				{
                    dd = this.list_of_days_for_person_sorted_[p][i + 1] - this.list_of_days_for_person_sorted_[p][i - 1];
					sum_sq_diff += (dd * dd);
				}
			}
			else
            if (this.list_of_days_for_person_sorted_[p][i + 1] == d)
			{
                    if (i + 2 < this.list_of_days_for_person_sorted_[p].length) s = this.list_of_days_for_person_sorted_[p][i + 2] - this.list_of_days_for_person_sorted_[p][i];
                    var dd = this.list_of_days_for_person_sorted_[p][i + 1] - this.list_of_days_for_person_sorted_[p][i];
                    sum_sq_diff -= (dd * dd);
			}
            else s = this.list_of_days_for_person_sorted_[p][i + 1] - this.list_of_days_for_person_sorted_[p][i];

			if (s >= 0 && s < newspread_p) newspread_p = s;
		}

		//spread p2
        var oldspread_p2 = this.spread_for_person_[p2];
		var newspread_p2 = oldspread_p2;
        if (this.list_of_days_for_person_sorted_[p2].length > 0)
		{
			var indPrev = -1;
			var indNext = 0;
            for (var i = 0; i < this.list_of_days_for_person_sorted_[p2].length; i++)
			{
                if (this.list_of_days_for_person_sorted_[p2][i] < d) indPrev++;
				else break;
			}
            if (indPrev < this.list_of_days_for_person_sorted_[p2].length - 1) indNext = indPrev + 1;

			var s = -1;
            if (indPrev >= 0) s = d - this.list_of_days_for_person_sorted_[p2][indPrev];
			if (s >= 0 && s < newspread_p2) newspread_p2 = s;
            if (indNext >= 0) s = this.list_of_days_for_person_sorted_[p2][indNext] - d;
			if (s >= 0 && s < newspread_p2) newspread_p2 = s;

			var dd;
			if(indPrev >= 0) {
                dd = d - this.list_of_days_for_person_sorted_[p2][indPrev];
				sum_sq_diff += (dd * dd);
			}
			if(indNext >= 0) {
                dd = this.list_of_days_for_person_sorted_[p2][indNext] - d;
				sum_sq_diff += (dd * dd);
			}
			if(indPrev >= 0 && indNext >= 0) {
                dd = this.list_of_days_for_person_sorted_[p2][indNext] - this.list_of_days_for_person_sorted_[p2][indPrev];
				sum_sq_diff -= (dd * dd);
			}
		}

        var distr_sum_sq_MAX = (this.data_.getNmbDays() * this.data_.getNmbDays()) * this.data_.getNmbPersons();
		distr_diff = (newspread_p - oldspread_p) + (newspread_p2 - oldspread_p2);
		distr_diff = (-1) * distr_diff + sum_sq_diff / distr_sum_sq_MAX;

		diff[1] = distr_diff;

		return diff;
	}
    
	// replace assignments (p1,d1) with (p2,d2) with (p1, d2) and (p2, d1)
	swap(p1, d1, p2, d2)
    {
        this.unassignPersonFromDay(p1, d1);
        this.unassignPersonFromDay(p2, d2);
        this.assignPersonToDay(p2, d1);
        this.assignPersonToDay(p1, d2);
	}
    
	//calculate the difference in objective with replacing a duties (p1,d1) with (p2,d2) with (p1, d2) and (p2, d1)
	calculateObjDiffWithSwap(p1, d1, p2, d2)
    {
      
        if (this.assignment[p1][d1] == 0 || this.assignment[p2][d2] == 0) { alert("calculateObjDiffWithReplacing::error"); }

        var diff = new Array(2);
        diff[0] = 0; diff[1] = 0;
        
        if (this.assignment[p2][d1] > 0 || this.data_.isPersonAvailableOnDay(p2, d1) == 0 || this.assignment[p1][d2] > 0 || this.data_.isPersonAvailableOnDay(p1, d2) == 0)
        {
            diff[0] = 1000000;
            return diff;
        }
        
		//no fairness difference		
		diff[0] = 0;

		//distr diff
		var distr_diff = 0;
		//spread p1
        var oldspread_p1 = this.spread_for_person_[p1];
		var newspread_p1 = 10000;
		var old_sum_sq_p1 = 0;
        var new_sum_sq_p1 = 0;

        for (var i = 0; i < this.list_of_days_for_person_sorted_[p1].length - 1; i++)
		{
            var dd1 = this.list_of_days_for_person_sorted_[p1][i];
            var dd2 = this.list_of_days_for_person_sorted_[p1][i + 1];
			old_sum_sq_p1 += ((dd2 - dd1) * (dd2 - dd1));
		}

        var new_list_p1 = new Array(0);
        for (var i = 0; i < this.list_of_days_for_person_sorted_[p1].length; i++) {
            if (this.list_of_days_for_person_sorted_[p1][i] == d1) {
                new_list_p1.push(d2);
            }
            else {
                new_list_p1.push(this.list_of_days_for_person_sorted_[p1][i]);
            }
        }
        new_list_p1.sort(compareNumbers);

        for (var i = 0; i < new_list_p1.length - 1; i++)
		{
			var dd1 = new_list_p1[i];
			var dd2 = new_list_p1[i + 1];
			var spac = dd2 - dd1;
			if(spac < newspread_p1) newspread_p1 = spac;
			new_sum_sq_p1 += (spac * spac);
		}
        
		//spread p2
		var oldspread_p2 = this.spread_for_person_[p2];
		var newspread_p2 = 10000;
		var old_sum_sq_p2 = 0;
        var new_sum_sq_p2 = 0;
        for (var i = 0; i < this.list_of_days_for_person_sorted_[p2].length - 1; i++)
		{
            var dd1 = this.list_of_days_for_person_sorted_[p2][i];
            var dd2 = this.list_of_days_for_person_sorted_[p2][i + 1];
			old_sum_sq_p2 += ((dd2 - dd1) * (dd2 - dd1));
		}
        
        var new_list_p2 = new Array(0);
        for (var i = 0; i < this.list_of_days_for_person_sorted_[p2].length; i++) {
            if (this.list_of_days_for_person_sorted_[p2][i] == d2) new_list_p2.push(d1);
            else new_list_p2.push(this.list_of_days_for_person_sorted_[p2][i]);
        }
        new_list_p2.sort(compareNumbers);

        for (var i = 0; i < new_list_p2.length - 1; i++)
		{			
			var dd1 = new_list_p2[i];
			var dd2 = new_list_p2[i + 1];
			var spac = dd2 - dd1;
			if(spac < newspread_p2) newspread_p2 = spac;
			new_sum_sq_p2 += (spac * spac);
		}
        
        var distr_sum_sq_MAX = (this.data_.getNmbDays() * this.data_.getNmbDays()) * this.data_.getNmbPersons();
		var sum_sq_diff = ((new_sum_sq_p1 - old_sum_sq_p1) + (new_sum_sq_p2 - old_sum_sq_p2));
		distr_diff = (newspread_p1 - oldspread_p1) + (newspread_p2 - oldspread_p2);
		distr_diff = (-1) * distr_diff + sum_sq_diff / distr_sum_sq_MAX;
        
		diff[1] = distr_diff;

        return diff;
    }

    local_search(time_limit)
    {
        var starttimeLS = performance.now(); // milliseconds
        time_limit = time_limit * 1000;      // time limit in milliseconds
        var iter = 0;
        var iter_best = 0;    
        var maxNmbItersWithNoImprovement = 200;

        for (var loop = 0; loop < 1000000; loop++)
        {            
            var X = 10;
            if (loop % 5 == 0 && loop > 0)
	        {
		        OBJECTIVE_IMPORTANCE_DISTR = 2;
		        OBJECTIVE_IMPORTANCE_FAIRNESS = 1;
		        X = 1;
		        maxNmbItersWithNoImprovement = 100;
	        }
	        else
	        {
		        OBJECTIVE_IMPORTANCE_DISTR = 1;
		        OBJECTIVE_IMPORTANCE_FAIRNESS = 2;
		        X = 3;
		        maxNmbItersWithNoImprovement = 500;
	        }

            var t = (performance.now() - starttimeLS) / 1000;
            // document.write("loop " + loop + " cpu " + t.toPrecision(3) + "<br/>");

            if (loop > 0 && loop % 5 == 0) //recover best
            {
                for (var p = 0; p < this.data_.getNmbPersons(); p++)
                    for (var d = 0; d < this.data_.getNmbDays(); d++)
                        if (this.assignment[p][d] > 0) this.unassignPersonFromDay(p, d);

                for (var p = 0; p < this.data_.getNmbPersons(); p++)
                    for (var d = 0; d < this.data_.getNmbDays(); d++)
                        if (best_assignment[p][d] > 0) this.assignPersonToDay(p, d);
	        }

            //ls replace
            while (true)
	        {
                iter++;
		        var hasImproved = false;
		        for (var d = 0; d < this.data_.getNmbDays(); d++)
                {
			        var changeHappened = false;
			        var bestd = d;
			        var bestp = -1;
			        var bestp2 = -1;
			        var bestdiff = new Array(0);
                    bestdiff.push(1000000); bestdiff.push(1000000);

			        for (var i = 0; i < this.nmb_assignments_for_day_[d]; i++)
			        {
                        var p = this.list_of_persons_for_day_[d][i];
				        for (var j = 0; j < this.data_.getDay(d).list_of_available_persons_.length; j++)
				        {
					        var p2 = this.data_.getDay(d).list_of_available_persons_[j];
					        if (p2 == p) continue;
                            if (this.assignment[p2][d] > 0) continue;
                            var diff = this.calculateObjDiffWithReplacing(p, d, p2);                    
                            if (isDifferenceGood(diff)) //replace
					        {
						        if(smallerObj(diff, bestdiff))
						        {
							        bestp = p;
							        bestp2 = p2;
							        bestdiff = diff;                            
						        }
                            }
				        }
                        if (changeHappened) break;
                    }
                    if (bestp >= 0) {
                        this.replace(bestp, d, bestp2);
                        var obj = this.calculateObjective();
                        if (smallerObjABS(obj, best_obj)) {
                            copyArray1D(obj, best_obj);
                            copyArray2D(this.assignment, best_assignment);
                            iter_best = iter;
                            var t = (performance.now() - starttimeLS) / 1000;                            
                            console.log(" objective: " + obj[0] + " " + obj[1] + " cpu " + t.toPrecision(3) + "<br/>");
                        }
                        changeHappened = true;
                        hasImproved = true;
                    }

		        }

                if (hasImproved == false) { break; }
                if (iter - iter_best > maxNmbItersWithNoImprovement) { break; }
            }

            //ls swap + perturbation
            for (var x = 0; x < X; x++)
            {                
                iter = 0;
                iter_best = 0;
                //ls swap
                var nmbswaploops = 1;
                for (var l = 0; l < nmbswaploops; l++) {
                    iter++;      
                    var hasImproved = false;        
                    for (var p1 = 0; p1 < this.data_.getNmbPersons(); p1++)
                    {
                        var changeHappened = false;
                        for (var p2 = p1 + 1; p2 < this.data_.getNmbPersons(); p2++)
                        {                
                            for (var d1_i = 0; d1_i < this.nmb_assignments_for_person_[p1]; d1_i++)
                            {
                                var d1 = this.list_of_days_for_person_[p1][d1_i];
                                for (var d2_i = 0; d2_i < this.nmb_assignments_for_person_[p2]; d2_i++)
                                {
                                    var d2 = this.list_of_days_for_person_[p2][d2_i];
                                    if (d1 == d2) continue;
                                    if (this.assignment[p1][d2] > 0 || this.assignment[p2][d1] > 0) continue;
                                    if (this.data_.isPersonAvailableOnDay(p1, d2) == false || this.data_.isPersonAvailableOnDay(p2, d1) == false) continue;                                    
                                    var diff = this.calculateObjDiffWithSwap(p1, d1, p2, d2);  

                                    if (isDifferenceGood(diff) || (Math.random() <= 0.01 && diff[0] == 0 && diff[1] == 0)) //swap
                                    {                                        
                                        this.swap(p1, d1, p2, d2);
                                        changeHappened = true;
                                        hasImproved = true;
                                        var obj = this.calculateObjective();
                                        if (smallerObjABS(obj, best_obj)) {                                    
                                            copyArray1D(obj, best_obj);
                                            copyArray2D(this.assignment, best_assignment);
                                            iter_best = iter;                                            
                                            var t = (performance.now() - starttimeLS) / 1000;
                                            console.log(" objective: " + obj[0] + " " + obj[1] + " cpu " + t.toPrecision(3) + "<br/>");                                            
                                            if (obj[0] < 0.011 && obj[1] < -499) return;

                                        }                                                
                                        break;
                                    }
                                    if (changeHappened) break;
                                } //d2
                                if (changeHappened) break;
                            } //d1
                        } //p2
                    } //p1
                    if (hasImproved == false) break;
                    if (iter - iter_best > maxNmbItersWithNoImprovement) break;       
                }
              
                //perturbation
                var indices = new Array(0);
                for (var i = 0; i < this.data_.getNmbPersons(); i++) indices.push(i);
                shuffleArray(indices);
                for (var p1i = 0; p1i < this.data_.getNmbPersons(); p1i++)
                {
                    var p1 = indices[p1i];
                    var changeHappened = false;
                    for (var p2i = p1i + 1; p2i < this.data_.getNmbPersons(); p2i++)
                    {
                        var p2 = indices[p2i];
                        for (var d1_i = 0; d1_i < this.nmb_assignments_for_person_[p1]; d1_i++)
                        {
                            var d1 = this.list_of_days_for_person_[p1][d1_i];
                            for (var d2_i = 0; d2_i < this.nmb_assignments_for_person_[p2]; d2_i++)
                            {
                                var d2 = this.list_of_days_for_person_[p2][d2_i];
                                if (d1 == d2) continue;
                                if (this.assignment[p1][d2] > 0 || this.assignment[p2][d1] > 0) continue;
                                if (this.data_.isPersonAvailableOnDay(p1, d2) == false || this.data_.isPersonAvailableOnDay(p2, d1) == false) continue;

                                var diff = this.calculateObjDiffWithSwap(p1, d1, p2, d2);
                                if (isDifferenceGood(diff) || (diff[0] == 0 && diff[1] == 0)) //swap
                                {
                                    this.swap(p1, d1, p2, d2);
                                    changeHappened = true;
                                    break;
                                }
                                if (changeHappened) break;
                            } //d2
                            if (changeHappened) break;
                        } //d1
                        if (changeHappened) break;
                    } //p2
                } //p1
        
            } //x

            var currtime = performance.now();
            if (currtime - starttimeLS > time_limit) break;

        } //i
        
        //recover best
        for (var p = 0; p < this.data_.getNmbPersons(); p++)
            for (var d = 0; d < this.data_.getNmbDays(); d++)
                if (this.assignment[p][d] > 0) this.unassignPersonFromDay(p, d);

        for (var p = 0; p < this.data_.getNmbPersons(); p++)
            for (var d = 0; d < this.data_.getNmbDays(); d++)
                if (best_assignment[p][d] > 0) this.assignPersonToDay(p, d);
    
    }

    toString() {    
        var s = "";
        for (var p = 0; p < this.data_.getNmbPersons(); p++) {
            s = s + ("Person" + p + " ");
            s = s + ("#working_days " + this.nmb_assignments_for_person_[p] + " :");
            for (var i = 0; i < this.nmb_assignments_for_person_[p]; i++)
                s = s + (" " + this.list_of_days_for_person_sorted_[p][i]);
            s = s + (" min_spread " + this.spread_for_person_[p]);
            s = s + "\n";
        }
        s = s + ("min number of duties for a person = " + this.min_nmb_assignments_for_a_single_person + "\n");
        s = s + ("max number of duties for a person = " + this.max_nmb_assignments_for_a_single_person + "\n");
        var obj = this.calculateObjective();
        s = s + ("objective: " + obj[0] + " " + obj[1] + "\n");
        s = s + ("check: " + this.check() + "\n");
        return s;
    }
  
}

var data = new Data(0, 0);

var reader = new FileReader();
reader.onload = function (event) {

    var contents = event.target.result;    
    var lines = contents.split('\n');    

    TOTAL_NUMBER_OF_PERSONS = parseInt(lines[0]);
    TOTAL_NUMBER_OF_DAYS = parseInt(lines[1]);

    data = new Data(TOTAL_NUMBER_OF_PERSONS, TOTAL_NUMBER_OF_DAYS);

    for (var p = 0; p < TOTAL_NUMBER_OF_PERSONS; p++) {
        var P = new Person(p);
        data.addPerson(P);
    }

    for (var d = 0; d < lines.length - 2; d++) {
        var words = lines[d + 2].split(' ');

        var demand = parseInt(words[0]);
        var D = new Day(d, demand);
        data.addDay(D);

        for (var i = 1; i < words.length; i++) {
            var p = parseInt(words[i]);
            data.setAvailability(p, d, 1);
        }
    }
           
};


reader.onerror = function (event) {
    console.error("File could not be read! Code " + event.target.error.code);
};


var control = document.getElementById("fileinput");
control.addEventListener("change", function (event) {
    var files = control.files;
    reader.readAsText(files[0]);
}, false);


function solve() {

    var timelimit = 5;
    var datafile = "data1.txt";
    var datafile = document.getElementById('fileinput').value;
    timelimit = document.getElementById('txtLimit').value;

    if (data.getNmbDays() == 0) 
    {
        alert("empty data!");
        return;
    }

    sol = new Solution(data);

    //******************** initial solution ****************************
    sol.greedy_assignment();
    var obj = sol.calculateObjective();
    //******************************************************************

    //------------------ init best obj and best sol --------------------
    best_obj = new Array(2);
    best_assignment = new Array(data.getNmbPersons());
    for (var i = 0; i < data.getNmbPersons(); i++)
        best_assignment[i] = new Array(data.getNmbDays());
    copyArray1D(obj, best_obj);
    copyArray2D(sol.assignment, best_assignment);
    //------------------------------------------------------------------

    //************************* Local Search ***************************
    sol.local_search(timelimit);    
   
    document.getElementById('result').style.display = "block";
    var resultString = data.toString() + "\n" + sol.toString();
    document.getElementById("result").value = resultString;
    //******************************************************************

}